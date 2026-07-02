import { badRequest, conflict, notFound, validationError } from '../utils/httpError.js';
import { money, toInteger } from '../utils/formatters.js';

export function createCartService({ cartRepository, gameRepository, purchaseRepository, database }) {
  function cartView(cart) {
    const items = cartRepository.getItems(cart.id).map(item => {
      const game = gameRepository.findById(item.gameId);
      const effectivePrice = item.discountPrice ?? item.unitPrice;
      return { ...item, game, subtotal: money(effectivePrice * item.quantity) };
    }).filter(item => item.game);

    const subtotal = money(items.reduce((sum, item) => sum + item.subtotal, 0));
    let discountTotal = 0;
    if (cart.promoCode) {
      const promo = cartRepository.findPromo(cart.promoCode);
      if (promo?.type === 'percentage') discountTotal = money(subtotal * (promo.value / 100));
      if (promo?.type === 'fixed') discountTotal = Math.min(Number(promo.value), subtotal);
    }
    const estimatedTax = money((subtotal - discountTotal) * 0.07);
    const total = money(subtotal - discountTotal + estimatedTax);
    return { id: cart.id, status: cart.status, promoCode: cart.promoCode, items, summary: { subtotal, discountTotal, estimatedTax, total } };
  }

  return {
    view(userId) {
      return cartView(cartRepository.getActiveCart(userId));
    },
    addItem(userId, body) {
      const gameId = toInteger(body.gameId);
      const quantityRaw = body.quantity === undefined || body.quantity === null || body.quantity === '' ? 1 : Number(body.quantity);
      const quantity = Number.isInteger(quantityRaw) ? quantityRaw : null;
      if (!gameId) throw validationError([{ field: 'gameId', message: 'gameId is required.' }]);
      if (!Number.isInteger(quantity) || quantity <= 0) throw validationError([{ field: 'quantity', message: 'Quantity must be greater than zero.' }]);
      const game = gameRepository.findById(gameId);
      if (!game) throw notFound('Game not found.');
      if (!['active', 'preorder', 'beta'].includes(game.status)) throw conflict('Game is not available.');
      if (game.stock <= 0 || quantity > game.stock) throw conflict('Insufficient stock.');
      const cart = cartRepository.getActiveCart(userId);
      const existing = cartRepository.getItemByGame(cart.id, gameId);
      if (existing && existing.quantity + quantity > game.stock) throw conflict('Insufficient stock.');
      cartRepository.addItem(cart.id, game, quantity);
      return cartView(cartRepository.getActiveCart(userId));
    },
    updateItem(userId, itemId, body) {
      const quantity = toInteger(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) throw validationError([{ field: 'quantity', message: 'Quantity must be greater than zero.' }]);
      const cart = cartRepository.getActiveCart(userId);
      const item = cartRepository.getItem(cart.id, Number(itemId));
      if (!item) throw notFound('Cart item not found.');
      const game = gameRepository.findById(item.gameId);
      if (quantity > game.stock) throw conflict('Insufficient stock.');
      cartRepository.updateQuantity(item.id, quantity);
      return cartView(cartRepository.getActiveCart(userId));
    },
    removeItem(userId, itemId) {
      const cart = cartRepository.getActiveCart(userId);
      const changes = cartRepository.removeItem(cart.id, Number(itemId));
      if (!changes) throw notFound('Cart item not found.');
      return cartView(cartRepository.getActiveCart(userId));
    },
    clear(userId) {
      const cart = cartRepository.getActiveCart(userId);
      cartRepository.clear(cart.id);
      return cartView(cartRepository.getActiveCart(userId));
    },
    applyPromo(userId, code) {
      const normalized = String(code || '').trim().toUpperCase();
      if (!normalized) throw validationError([{ field: 'code', message: 'Promo code is required.' }]);
      const promo = cartRepository.findPromo(normalized);
      if (!promo || promo.status !== 'active') throw notFound('Invalid promo code.');
      if (promo.currentUses >= promo.maxUses) throw conflict('Promo code usage limit reached.');
      const cart = cartRepository.getActiveCart(userId);
      if (!cartRepository.getItems(cart.id).length) throw badRequest('Your cart is empty.');
      cartRepository.applyPromo(cart.id, promo.code);
      return cartView(cartRepository.getActiveCart(userId));
    },
    checkout(userId) {
      const cart = cartRepository.getActiveCart(userId);
      const view = cartView(cart);
      if (!view.items.length) throw badRequest('Your cart is empty.');

      return database.transaction(() => {
        for (const item of view.items) {
          const game = gameRepository.findById(item.game.id);
          if (!game || !['active', 'preorder', 'beta'].includes(game.status)) throw conflict(`${item.game.title} is no longer available.`);
          if (game.stock < item.quantity) throw conflict(`Insufficient stock for ${item.game.title}.`);
          const changed = gameRepository.decrementStock(game.id, item.quantity);
          if (!changed) throw conflict(`Insufficient stock for ${item.game.title}.`);
        }
        if (cart.promoCode) cartRepository.incrementPromoUse(cart.promoCode);
        const purchase = purchaseRepository.create(userId, view.summary, view.items);
        cartRepository.checkout(cart.id);
        cartRepository.createActiveCart(userId);
        return purchase;
      });
    }
  };
}
