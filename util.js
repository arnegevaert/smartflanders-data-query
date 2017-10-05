const moment = require('moment');
const lodash = require('lodash');
const n3 = require('n3');

// Filters a list of triples using a given template
// Returns an array of matching triples
module.exports.filterTriples = function (template, triples) {
    let result = [];
    triples.forEach(t => {
        let match = (template.graph === undefined || t.graph === template.graph) &&
            (template.subject === undefined || t.subject === template.subject) &&
            (template.predicate === undefined || t.predicate === template.predicate) &&
            (template.object === undefined || t.object === template.object);
        if (match) {
            result.push(t);
        }
    });
    return result;
};

module.exports.getSubRangeGatesFromTriples = function (triples) {
    const hasRangeGate = 'http://semweb.datasciencelab.be/ns/multidimensional-interface/hasRangeGate';

    const rgTriples = module.exports.filterTriples({predicate: hasRangeGate}, triples);
    const result = [];
    rgTriples.forEach(rgt => {
        result.push(rgt.object);
    });

    return result;
};

module.exports.checkDayLevel = function(triples) {
    const bounds = module.exports.getBounds(triples);
    return bounds.final - bounds.init < 60*60*25; // 1 hour margin
};

module.exports.getBounds = function(triples) {
    const pInitial = 'http://semweb.datasciencelab.be/ns/multidimensional-interface/initial';
    const pFinal = 'http://semweb.datasciencelab.be/ns/multidimensional-interface/final';

    const initTriple = lodash.find(triples, t => t.predicate === pInitial);
    const finalTriple = lodash.find(triples, t => t.predicate === pFinal);

    const init = moment(n3.Util.getLiteralValue(initTriple.object)).unix();
    const final = moment(n3.Util.getLiteralValue(finalTriple.object)).unix();

    return {init: init, final: final};
};