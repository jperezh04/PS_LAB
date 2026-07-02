export function createCartController({ cartService }) {
  return {
    view(req, res, next) {
      try { res.json({ data: cartService.view(req.user.id) }); } catch (error) { next(error); }
    },
    add(req, res, next) {
      try { res.status(201).json({ message: 'Game added to cart.', data: cartService.addItem(req.user.id, req.body) }); } catch (error) { next(error); }
    },
    update(req, res, next) {
      try { res.json({ message: 'Cart item updated.', data: cartService.updateItem(req.user.id, req.params.itemId, req.body) }); } catch (error) { next(error); }
    },
    remove(req, res, next) {
      try { res.json({ message: 'Cart item removed.', data: cartService.removeItem(req.user.id, req.params.itemId) }); } catch (error) { next(error); }
    },
    clear(req, res, next) {
      try { res.json({ message: 'Cart emptied.', data: cartService.clear(req.user.id) }); } catch (error) { next(error); }
    },
    promo(req, res, next) {
      try { res.json({ message: 'Promo code applied.', data: cartService.applyPromo(req.user.id, req.body.code) }); } catch (error) { next(error); }
    },
    checkout(req, res, next) {
      try { res.status(201).json({ message: 'Purchase completed successfully.', data: cartService.checkout(req.user.id) }); } catch (error) { next(error); }
    }
  };
}
