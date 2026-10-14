    /* Shared helper for splitting the core game across several classic scripts.
     *
     * NeonSurvivorGame is defined once in core/game.js; every other core file
     * contributes the methods it owns. Classic scripts share one global lexical
     * scope, so `NeonCore` and `NeonSurvivorGame` are visible to every file that
     * index.html loads afterwards — no bundler, no modules.
     *
     * Sources are written as class expressions, which is exactly the syntax the
     * methods had inside the original class body. That keeps the split a pure
     * move: no comma juggling, no re-indentation, no reformatting. Property
     * descriptors are copied verbatim, so the mixed-in methods stay writable,
     * configurable and NON-enumerable like real class methods. That matters:
     * network/world-view.js builds guest views with `Object.create(game)`, and an
     * enumerable prototype would change what those objects expose.
     */
    const NeonCore = Object.freeze({
      define(target, source) {
        if (typeof target !== 'function' || !target.prototype) {
          throw new Error('NeonCore.define expects a class as its target');
        }
        const proto = typeof source === 'function' ? source.prototype : source;
        if (!proto || (typeof proto !== 'object' && typeof proto !== 'function')) {
          throw new Error('NeonCore.define expects a class or method object as its source');
        }
        for (const name of Object.getOwnPropertyNames(proto)) {
          if (name === 'constructor') continue;
          if (Object.hasOwn(target.prototype, name)) {
            throw new Error(`NeonCore.define: duplicate method ${name}`);
          }
          const descriptor = Object.getOwnPropertyDescriptor(proto, name);
          if (typeof descriptor.value !== 'function') {
            throw new Error(`NeonCore.define: ${name} is not a method`);
          }
          Object.defineProperty(target.prototype, name, {
            value: descriptor.value,
            writable: true,
            configurable: true,
            enumerable: false
          });
        }
        return target;
      }
    });
