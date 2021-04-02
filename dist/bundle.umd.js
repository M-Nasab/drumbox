
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Drumbox = factory());
}(this, (function () { 'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/TicksInput.svelte generated by Svelte v3.35.0 */
    const file$2 = "src/components/TicksInput.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (57:8) {#each Array(steps) as _, j}
    function create_each_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*i*/ ctx[15], /*j*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "tick-button svelte-1jf3tap");
    			toggle_class(button, "is-selected", /*isTickSelected*/ ctx[2](/*i*/ ctx[15], /*j*/ ctx[17]));
    			toggle_class(button, "has-cursor", /*hasCursor*/ ctx[3](/*i*/ ctx[15], /*j*/ ctx[17]));
    			toggle_class(button, "is-first-row", /*i*/ ctx[15] === 0);
    			toggle_class(button, "is-last-row", /*i*/ ctx[15] === /*steppers*/ ctx[1] - 1);
    			toggle_class(button, "is-first-col", /*j*/ ctx[17] === 0);
    			toggle_class(button, "is-last-col", /*j*/ ctx[17] === /*steps*/ ctx[0] - 1);
    			add_location(button, file$2, 57, 12, 1383);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*isTickSelected*/ 4) {
    				toggle_class(button, "is-selected", /*isTickSelected*/ ctx[2](/*i*/ ctx[15], /*j*/ ctx[17]));
    			}

    			if (dirty & /*hasCursor*/ 8) {
    				toggle_class(button, "has-cursor", /*hasCursor*/ ctx[3](/*i*/ ctx[15], /*j*/ ctx[17]));
    			}

    			if (dirty & /*steppers*/ 2) {
    				toggle_class(button, "is-last-row", /*i*/ ctx[15] === /*steppers*/ ctx[1] - 1);
    			}

    			if (dirty & /*steps*/ 1) {
    				toggle_class(button, "is-last-col", /*j*/ ctx[17] === /*steps*/ ctx[0] - 1);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(57:8) {#each Array(steps) as _, j}",
    		ctx
    	});

    	return block;
    }

    // (56:4) {#each Array(steppers) as _, i}
    function create_each_block(ctx) {
    	let each_1_anchor;
    	let each_value_1 = Array(/*steps*/ ctx[0]);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isTickSelected, hasCursor, steppers, steps, toggleTick*/ 47) {
    				each_value_1 = Array(/*steps*/ ctx[0]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(56:4) {#each Array(steppers) as _, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let each_value = Array(/*steppers*/ ctx[1]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "ticks-input svelte-1jf3tap");
    			attr_dev(div, "style", /*style*/ ctx[4]);
    			add_location(div, file$2, 54, 0, 1264);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Array, steps, isTickSelected, hasCursor, steppers, toggleTick*/ 47) {
    				each_value = Array(/*steppers*/ ctx[1]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*style*/ 16) {
    				attr_dev(div, "style", /*style*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let isTickSelected;
    	let hasCursor;
    	let style;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TicksInput", slots, []);
    	const dispatch = createEventDispatcher();
    	let { steps } = $$props;
    	let { steppers } = $$props;
    	let { data = {} } = $$props;
    	let { state = [] } = $$props;
    	let ticks = [];

    	function addTick(stepper, step) {
    		$$invalidate(8, ticks = [...ticks, { step, stepper, data }]);
    	}

    	function removeTick(stepper, step) {
    		$$invalidate(8, ticks = ticks.filter(tick => {
    			return tick.step !== step || tick.stepper !== stepper;
    		}));
    	}

    	function toggleTick(stepper, step) {
    		if (isTickSelected(stepper, step)) {
    			removeTick(stepper, step);
    		} else {
    			addTick(stepper, step);
    		}

    		
    		dispatch("change", ticks);
    	}

    	const writable_props = ["steps", "steppers", "data", "state"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TicksInput> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (i, j) => toggleTick(i, j);

    	$$self.$$set = $$props => {
    		if ("steps" in $$props) $$invalidate(0, steps = $$props.steps);
    		if ("steppers" in $$props) $$invalidate(1, steppers = $$props.steppers);
    		if ("data" in $$props) $$invalidate(6, data = $$props.data);
    		if ("state" in $$props) $$invalidate(7, state = $$props.state);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		steps,
    		steppers,
    		data,
    		state,
    		ticks,
    		addTick,
    		removeTick,
    		toggleTick,
    		isTickSelected,
    		hasCursor,
    		style
    	});

    	$$self.$inject_state = $$props => {
    		if ("steps" in $$props) $$invalidate(0, steps = $$props.steps);
    		if ("steppers" in $$props) $$invalidate(1, steppers = $$props.steppers);
    		if ("data" in $$props) $$invalidate(6, data = $$props.data);
    		if ("state" in $$props) $$invalidate(7, state = $$props.state);
    		if ("ticks" in $$props) $$invalidate(8, ticks = $$props.ticks);
    		if ("isTickSelected" in $$props) $$invalidate(2, isTickSelected = $$props.isTickSelected);
    		if ("hasCursor" in $$props) $$invalidate(3, hasCursor = $$props.hasCursor);
    		if ("style" in $$props) $$invalidate(4, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ticks*/ 256) {
    			$$invalidate(2, isTickSelected = function (stepper, step) {
    				return !!ticks.find(tick => {
    					return tick.step === step && tick.stepper === stepper;
    				});
    			});
    		}

    		if ($$self.$$.dirty & /*state*/ 128) {
    			$$invalidate(3, hasCursor = function (stepper, step) {
    				return !!state.find(cursor => {
    					return cursor.step === step && cursor.stepper === stepper;
    				});
    			});
    		}

    		if ($$self.$$.dirty & /*steps*/ 1) {
    			$$invalidate(4, style = `grid-template-columns: repeat(${steps}, 1fr)`);
    		}
    	};

    	return [
    		steps,
    		steppers,
    		isTickSelected,
    		hasCursor,
    		style,
    		toggleTick,
    		data,
    		state,
    		ticks,
    		click_handler
    	];
    }

    class TicksInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { steps: 0, steppers: 1, data: 6, state: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TicksInput",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*steps*/ ctx[0] === undefined && !("steps" in props)) {
    			console.warn("<TicksInput> was created without expected prop 'steps'");
    		}

    		if (/*steppers*/ ctx[1] === undefined && !("steppers" in props)) {
    			console.warn("<TicksInput> was created without expected prop 'steppers'");
    		}
    	}

    	get steps() {
    		throw new Error("<TicksInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set steps(value) {
    		throw new Error("<TicksInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get steppers() {
    		throw new Error("<TicksInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set steppers(value) {
    		throw new Error("<TicksInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<TicksInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<TicksInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<TicksInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<TicksInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function _defineProperty$1(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function ownKeys$1(object, enumerableOnly) {
      var keys = Object.keys(object);

      if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
        keys.push.apply(keys, symbols);
      }

      return keys;
    }

    function _objectSpread2$1(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};

        if (i % 2) {
          ownKeys$1(Object(source), true).forEach(function (key) {
            _defineProperty$1(target, key, source[key]);
          });
        } else if (Object.getOwnPropertyDescriptors) {
          Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
        } else {
          ownKeys$1(Object(source)).forEach(function (key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
          });
        }
      }

      return target;
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function ownKeys(object, enumerableOnly) {
      var keys = Object.keys(object);

      if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
        keys.push.apply(keys, symbols);
      }

      return keys;
    }

    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};

        if (i % 2) {
          ownKeys(Object(source), true).forEach(function (key) {
            _defineProperty(target, key, source[key]);
          });
        } else if (Object.getOwnPropertyDescriptors) {
          Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
        } else {
          ownKeys(Object(source)).forEach(function (key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
          });
        }
      }

      return target;
    }

    function _toConsumableArray(arr) {
      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
    }

    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) return _arrayLikeToArray(arr);
    }

    function _iterableToArray(iter) {
      if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

      return arr2;
    }

    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var DEFAULT_OPTIONS$1 = {
      steps: 32,
      steppers: 7,
      initialState: null
    };
    function epicles() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var mergedOptions = _objectSpread2(_objectSpread2({}, DEFAULT_OPTIONS$1), options);

      var steps = mergedOptions.steps,
          steppers = mergedOptions.steppers,
          initialState = mergedOptions.initialState;

      if (steps < 2) {
        throw new Error('step size must be at least 2');
      }

      if (initialState && initialState.length !== steps) {
        throw new Error('initial state length must be equal to step size');
      }

      var state = initialState ? sanetizeState(initialState) : Array(steppers).fill(0);
      var subscribers = [];

      function sanetizeState(state) {
        return state.map(function (stepper) {
          return stepper > 0 ? stepper % steps : (steps - Math.abs(stepper) % steps) % steps;
        });
      }

      function cyclicIncrement(value) {
        return (value + 1) % steps;
      }

      function emitTickEvent(event) {
        subscribers.forEach(function (subscriber) {
          subscriber(event);
        });
      }

      function increment(state, index) {
        var tickEvents = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

        var nextState = _toConsumableArray(state);

        nextState[index] = cyclicIncrement(nextState[index]);
        tickEvents.push({
          step: nextState[index],
          stepper: index
        });

        if (nextState[index] === 0 && index < state.length - 1) {
          return increment(nextState, index + 1, tickEvents);
        }

        return {
          nextState: nextState,
          tickEvents: tickEvents
        };
      }

      function tick() {
        var _increment = increment(state, 0, []),
            nextState = _increment.nextState,
            tickEvents = _increment.tickEvents;

        state = nextState;
        emitTickEvent(tickEvents);
      }

      function subscribe(callback) {
        if (subscribers.find(callback)) return;
        subscribers.push(callback);

        var unsubscribe = function unsubscribe() {
          subscribers = subscribers.filter(function (subscriber) {
            return subscriber !== callback;
          });
        };

        return unsubscribe;
      }

      function getState() {
        return state.map(function (value, index) {
          return {
            stepper: index,
            step: value
          };
        });
      }

      return {
        tick: tick,
        subscribe: subscribe,
        getState: getState
      };
    }

    var DEFAULT_OPTIONS = {
      steps: 32,
      steppers: 7,
      ticks: []
    };
    function Djembe() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var subscribers = [];

      var options = _objectSpread2$1(_objectSpread2$1({}, DEFAULT_OPTIONS), opts);

      var steps = options.steps,
          steppers = options.steppers,
          initialState = options.initialState;
      var ticks = options.ticks;
      var epicle = epicles({
        steps: steps,
        steppers: steppers,
        initialState: initialState
      });
      epicle.subscribe(handleTickEvents);

      function handleTickEvents(events) {
        var emittedTicks = ticks.filter(function (tick) {
          var shouldBeEmitted = !!events.find(function (event) {
            return event.step === tick.step && event.stepper === tick.stepper;
          });
          return shouldBeEmitted;
        });
        var state = epicle.getState();
        emit(emittedTicks, state);
      }

      function emit(ticks, state) {
        subscribers.forEach(function (subscriber) {
          subscriber({
            ticks: ticks,
            state: state
          });
        });
      }

      function tick() {
        epicle.tick();
      }

      function subscribe(callback) {
        if (subscribers.find(callback)) return;
        subscribers.push(callback);

        var unsubscribe = function unsubscribe() {
          subscribers = subscribers.filter(function (subscriber) {
            return subscriber !== callback;
          });
        };

        return unsubscribe;
      }

      function setTicks(nextTicks) {
        ticks = nextTicks;
      }

      return {
        subscribe: subscribe,
        tick: tick,
        setTicks: setTicks
      };
    }

    /* src/components/MusicBox.svelte generated by Svelte v3.35.0 */
    const file$1 = "src/components/MusicBox.svelte";

    // (70:12) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("stop");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(70:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (68:12) {#if !interval}
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("play");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(68:12) {#if !interval}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let ticksinput;
    	let t;
    	let div1;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	ticksinput = new TicksInput({
    			props: {
    				steps: /*steps*/ ctx[0],
    				steppers: /*steppers*/ ctx[1],
    				data: /*data*/ ctx[2],
    				state: /*state*/ ctx[3]
    			},
    			$$inline: true
    		});

    	ticksinput.$on("change", /*changeTicks*/ ctx[5]);

    	function select_block_type(ctx, dirty) {
    		if (!/*interval*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(ticksinput.$$.fragment);
    			t = space();
    			div1 = element("div");
    			button = element("button");
    			if_block.c();
    			attr_dev(div0, "class", "ticks-input-container svelte-5toemm");
    			add_location(div0, file$1, 56, 4, 3095);
    			attr_dev(button, "class", "play-pause-btn svelte-5toemm");
    			add_location(button, file$1, 66, 8, 3326);
    			attr_dev(div1, "class", "controls svelte-5toemm");
    			add_location(div1, file$1, 65, 4, 3295);
    			attr_dev(div2, "class", "music-box");
    			add_location(div2, file$1, 55, 0, 3067);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(ticksinput, div0, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			if_block.m(button, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*playPause*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const ticksinput_changes = {};
    			if (dirty & /*steps*/ 1) ticksinput_changes.steps = /*steps*/ ctx[0];
    			if (dirty & /*steppers*/ 2) ticksinput_changes.steppers = /*steppers*/ ctx[1];
    			if (dirty & /*data*/ 4) ticksinput_changes.data = /*data*/ ctx[2];
    			if (dirty & /*state*/ 8) ticksinput_changes.state = /*state*/ ctx[3];
    			ticksinput.$set(ticksinput_changes);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(ticksinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(ticksinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(ticksinput);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const intervalDuration = 100;
    const sound = "//OAxAAAAAAAAAAAAFhpbmcAAAAPAAAACQAABZcAGxsbGxsbGxsbGxtcXFxcXFxcXFxcXHJycnJycnJycnJyk5OTk5OTk5OTk5Ourq6urq6urq6ursnJycnJycnJycnJ5OTk5OTk5OTk5OT6+vr6+vr6+vr6+v//////////////AAAAOUxBTUUzLjk5cgJpAAAAACwsAAAUKCQEbUIAACgAAAWXfvUB2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zUMQAF4kOoANMWAIbnXXmZmZmZmJAkEwwMDA8WLDMzX2JAIACAAAEALAnAfjrJ5+//2MYxj3ve973vYxm977Ybm5ubg+D4EBAEDhQHz+CYPg+D5/UCAJ//3/4f/8QAg7xOD/wfP/D//4IKgAAgECi6SoUWzEGmdFZFLkDFCcohzD/86DEFkUMBp1HmsgBh6MFxYMYcSXtKoWAx0OkUYpwF2N99SQBJN1hrhoFmMqvAm6Z4NJFAUaWKJHQ+2F32H5KOVExJY4T5acyNOQ3VuKZD8X36mVyxx9KSGofgFqcHyNu78MifZueOUCUsYnIDj9+IWICkjpVasxDLtP+80zP2I/XjsSvw2/XIKn47R3oLrXa16pVlcol74am+7sxnWfeQTOUtHjlYhmKUk9eqWss8r8puU1u/UmZqJx6LXcqk1KY9bpbk9cp6t3k1PXZ3HutXo1Utfq7hzX7sVNY1ozQXd5fKqeeq832ryl/mWesLFq/fppV/O3t46+tvDWO7E7hd5ZmcKWrv/ys/O3VCQADAla7d/BB3vWgnhd8zVUSqfPaukYrocm4DWpzk0wMQjkjQCBELA3G8Coq//NAxC0hCwK2189AADa3HnKtMNRotSf6zx8zMXe0utWzt9Nwzbwq99VOhav87V6/pfoyVM+0N6PVTzDX6NE/UXXzzx9fXtUwv9bSl3cdsqFA0WDqhQgcKoJLNNAzjHTw7IELtaoYAIH/82DEAyAatp32w8o8ZNyXSD694JcBdmIiSPiUy2uUXY6rrt2txwUxhkqOtZgo9/9znyqp8Wqfr51CYQcSzGfjB7siHUNZhjizFcaZCx6FoWpVQiqUravOhnZSGcTdp7s1l/OSp2topDrSxidfsuR3+l7iLkAYRuxVZSVAAtFHaNR9cVj9mxAg110VFAcBhe3LtkDaDrKxRnrmSIz/81DEESBK+qY2eYUsLExKNzK5XxzwYHPYkpBzbbGRzOpGs1bJ2PLqGp2Bk/N3q2PBrnQw99uJZo/zNj4hCWafbS+MylLZN3n6Os9knZE2rIdN9zoqM/t+qLS7+rX8xKIQqWfSr2lZoNhw6OU4wprmPSFx3FLWhQ9qEYNepaoZk0AK//NQxAQdKPquXnmGzbdtu39nAazxXE9iP5lbGrSVIqGRMezcgmBUcWAbQL5U4/PA1PAMP9J/jUpWpNA4lglO2sTEnIKe/gkqJutG/3xW3caumbsb138d7pXuv8SSxLtFjf+v1/99fA3Zv9tjx/29996++sfNebvDDn9Qkv/dEKJAqv/zUMQEGrl2ojZ5hq79ySSECIolqFqq0GKT5Pe1mBV1g7zZRJBUs1ck7Eh2OjLtQsp1aDEltuVUlIz8+MxmqHzs7wlh5sKBoKrEs8t06VO5Y8PdIu2rLUlg7SgXMCIChR+Oe7kgWDpFrirolLXZbpV4iPfUAIZpZLMAvASz5080ZCH/80DEDhcBImBWewYcCTE1dwJh+ZocusmOF0RVLJ0ZRremVdgJmAhSkx+qxvVVCqv0v6qhXkSXUe/WdO8Su2Sqj3kVPDXrBWdI12qeRJYNHmHUeCv/7PiI8d+STEFNRTMuOTkuNaqqqv/zEMQNAAADSAAAAACqqqqqqqqqqqqqqqqq";

    function playTicks(ticks) {
    	ticks.forEach(() => {
    		const audio = new Audio("data:audio/wav;base64," + sound);
    		audio.play();
    	});
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MusicBox", slots, []);
    	let { steps } = $$props;
    	let { steppers } = $$props;
    	let { data = { intensity: "normal" } } = $$props;
    	let ticks = [];
    	let state = [];
    	let interval = null;
    	const djembe = Djembe({ steps, steppers, ticks });

    	djembe.subscribe(({ ticks, state: nextState }) => {
    		$$invalidate(3, state = nextState);
    		playTicks(ticks);
    	});

    	function changeTicks({ detail: ticks }) {
    		djembe.setTicks(ticks);
    	}

    	function playPause() {
    		if (!interval) {
    			clearInterval(interval);

    			$$invalidate(4, interval = setInterval(
    				function () {
    					djembe.tick();
    				},
    				intervalDuration
    			));
    		} else {
    			if (interval) {
    				clearInterval(interval);
    				$$invalidate(4, interval = null);
    			}
    		}
    	}

    	const writable_props = ["steps", "steppers", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MusicBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("steps" in $$props) $$invalidate(0, steps = $$props.steps);
    		if ("steppers" in $$props) $$invalidate(1, steppers = $$props.steppers);
    		if ("data" in $$props) $$invalidate(2, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		TicksInput,
    		Djembe,
    		steps,
    		steppers,
    		data,
    		ticks,
    		state,
    		interval,
    		intervalDuration,
    		sound,
    		djembe,
    		playTicks,
    		changeTicks,
    		playPause
    	});

    	$$self.$inject_state = $$props => {
    		if ("steps" in $$props) $$invalidate(0, steps = $$props.steps);
    		if ("steppers" in $$props) $$invalidate(1, steppers = $$props.steppers);
    		if ("data" in $$props) $$invalidate(2, data = $$props.data);
    		if ("ticks" in $$props) ticks = $$props.ticks;
    		if ("state" in $$props) $$invalidate(3, state = $$props.state);
    		if ("interval" in $$props) $$invalidate(4, interval = $$props.interval);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [steps, steppers, data, state, interval, changeTicks, playPause];
    }

    class MusicBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { steps: 0, steppers: 1, data: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MusicBox",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*steps*/ ctx[0] === undefined && !("steps" in props)) {
    			console.warn("<MusicBox> was created without expected prop 'steps'");
    		}

    		if (/*steppers*/ ctx[1] === undefined && !("steppers" in props)) {
    			console.warn("<MusicBox> was created without expected prop 'steppers'");
    		}
    	}

    	get steps() {
    		throw new Error("<MusicBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set steps(value) {
    		throw new Error("<MusicBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get steppers() {
    		throw new Error("<MusicBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set steppers(value) {
    		throw new Error("<MusicBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<MusicBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<MusicBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.35.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let musicbox;
    	let current;

    	musicbox = new MusicBox({
    			props: { steps: 6, steppers: 4 },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(musicbox.$$.fragment);
    			attr_dev(div0, "class", "m-box-wrapper svelte-rczsxo");
    			add_location(div0, file, 5, 2, 101);
    			attr_dev(div1, "class", "container svelte-rczsxo");
    			add_location(div1, file, 4, 0, 75);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(musicbox, div0, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(musicbox.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(musicbox.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(musicbox);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ MusicBox });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
      target: document.body
    });

    return app;

})));
