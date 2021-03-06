/*AMPERSAND_VERSION*/
/*jshint eqnull: true*/
var Events = require('ampersand-events');
var classExtend = require('ampersand-class-extend');
var assign = require('lodash.assign');
var slice = Array.prototype.slice;


function PaginatedCollection(collection, spec) {
    this.collection = collection;
    this.configure(spec || {}, true);
    this.offset = 0;
    this.listenTo(this.collection, 'all', this._onCollectionEvent);
}

assign(PaginatedCollection.prototype, Events, {
    // Public API

    // Update config with potentially new limit/offset
    configure: function (opts, slice) {
        if (this._parseSpec(opts) || slice) this._reSlice();
    },

    at: function (index) {
        return this.models[index];
    },

    // Internal API

    _parseSpec: function (spec) {
        var changed = false;
        if (spec.hasOwnProperty('limit') && this.limit !== spec.limit) {
            changed = true;
            this.limit = spec.limit;
        }
        if (spec.hasOwnProperty('offset') && this.offset !== spec.offset) {
            changed = true;
            this.offset = spec.offset;
        }
        return changed;
    },

    //Reslice our models with a proper emit
    _reSlice: function () {
        var rootModels = slice.call(this.collection.models);
        var offset = (this.offset || 0);
        if (this.limit || this.offset) {
            rootModels = rootModels.slice(offset, this.limit + offset);
        }
        this.models = rootModels;
        this.trigger('reset', this, {previousModels: this.collection.models});
    },

    // Normally we will reslice and emit a reset on every event, except when we
    // can derive that we will later be getting a sort event.
    // This is helpful for .set([many models]) from the collection which will send
    // us all the events AFTER the last model is already in our parent, so we can
    // limit ourselves to just one reset
    _onCollectionEvent: function (eventName, model, context, options) {
        /*jshint -W030 */
        options || (options = {});
        var sortable = this.collection.comparator && (options.at == null) && options.sort !== false;
        var add = options.add;
        var remove = options.remove;
        var ordered = !sortable && add && remove;

        if (eventName === 'add' || eventName === 'remove') {
            //See if we're gonna get a sort even later
            if (sortable) return;
            if (ordered && (model.isNew || !model[this.collection.mainIndex])) return;
        }
        if (eventName.match(/^change:/)) {
            return; //We'll get a raw change later
        }
        this._reSlice();

    }
});

Object.defineProperty(PaginatedCollection.prototype, 'length', {
    get: function () {
        return this.models.length;
    }
});

Object.defineProperty(PaginatedCollection.prototype, 'isCollection', {
    get: function () {
        return true;
    }
});

var arrayMethods = [
    'indexOf',
    'lastIndexOf',
    'every',
    'some',
    'forEach',
    'map',
    'filter',
    'reduce',
    'reduceRight'
];

arrayMethods.forEach(function (method) {
    PaginatedCollection.prototype[method] = function () {
        return this.models[method].apply(this.models, arguments);
    };
});

// alias each/forEach for maximum compatibility
PaginatedCollection.prototype.each = PaginatedCollection.prototype.forEach;

// methods to copy from parent
var collectionMethods = [
    'serialize',
    'toJSON'
];

collectionMethods.forEach(function (method) {
    PaginatedCollection.prototype[method] = function () {
        return this.collection[method].apply(this, arguments);
    };
});


PaginatedCollection.extend = classExtend;

module.exports = PaginatedCollection;
