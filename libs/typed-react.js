define('not_implemented_error',["require", "exports"], function (require, exports) {
    var NotImplementedError = (function () {
        function NotImplementedError(methodName) {
            this.name = "NotImplementedError";
            this.message = methodName + " should be implemented by React";
        }
        return NotImplementedError;
    })();
    return NotImplementedError;
});

define('mixin',["require", "exports", "./not_implemented_error"], function (require, exports, NotImplementedError) {
    var Mixin = (function () {
        function Mixin() {
        }
        Mixin.prototype.getDOMNode = function () {
            throw new NotImplementedError("getDomNode");
        };
        Mixin.prototype.setState = function (nextState, callback) {
            throw new NotImplementedError("setState");
        };
        Mixin.prototype.replaceState = function (nextState, callback) {
            throw new NotImplementedError("replaceState");
        };
        Mixin.prototype.forceUpdate = function (callback) {
            throw new NotImplementedError("forceUpdate");
        };
        Mixin.prototype.isMounted = function () {
            throw new NotImplementedError("isMounted");
        };
        Mixin.prototype.setProps = function (nextProps, callback) {
            throw new NotImplementedError("setProps");
        };
        Mixin.prototype.replaceProps = function (nextProps, callback) {
            throw new NotImplementedError("replaceProps");
        };
        return Mixin;
    })();
    return Mixin;
});

/// <reference path="../typings/react/react.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define('component',["require", "exports", "././mixin"], function (require, exports, Mixin) {
    var Component = (function (_super) {
        __extends(Component, _super);
        function Component() {
            _super.apply(this, arguments);
        }
        Component.prototype.render = function () {
            return null;
        };
        return Component;
    })(Mixin);
    return Component;
});

define('extract_prototype',["require", "exports"], function (require, exports) {
    var ILLEGAL_KEYS = {
        constructor: true,
        refs: true,
        props: true,
        state: true,
        getDOMNode: true,
        setState: true,
        replaceState: true,
        forceUpdate: true,
        isMounted: true,
        setProps: true,
        replaceProps: true
    };
    function extractPrototype(clazz) {
        var proto = {};
        for (var key in clazz.prototype) {
            if (ILLEGAL_KEYS[key] === undefined) {
                proto[key] = clazz.prototype[key];
            }
        }
        return proto;
    }
    return extractPrototype;
});

define('create_class',["require", "exports", "./extract_prototype", "react"], function (require, exports, extractPrototype, react) {
    function createClass(clazz, mixins) {
        var spec = extractPrototype(clazz);
        spec.displayName = clazz.prototype.constructor.name;
        if (spec.componentWillMount !== undefined) {
            var componentWillMount = spec.componentWillMount;
            spec.componentWillMount = function () {
                clazz.apply(this);
                componentWillMount.apply(this);
            };
        }
        else {
            spec.componentWillMount = function () {
                clazz.apply(this);
            };
        }
        if (mixins !== undefined && mixins !== null) {
            spec.mixins = mixins;
        }
        return react.createClass(spec);
    }
    return createClass;
});

define('create_mixin',["require", "exports", "./extract_prototype"], function (require, exports, extractPrototype) {
    function createMixin(clazz) {
        return extractPrototype(clazz);
    }
    return createMixin;
});

define('typed-react',["require", "exports", "./component", "./create_class", "./create_mixin", "./extract_prototype", "./mixin", "./not_implemented_error"], function (require, exports, Component, createClass, createMixin, extractPrototype, Mixin, NotImplementedError) {
    exports.Component = Component;
    exports.createClass = createClass;
    exports.createMixin = createMixin;
    exports.extractPrototype = extractPrototype;
    exports.Mixin = Mixin;
    exports.NotImplementedError = NotImplementedError;
});

