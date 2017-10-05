const Rx = require('rx');
const ldfetch = require('ldfetch');
const n3 = require('n3');
const moment = require('moment');
const lodash = require('lodash');

const util = require('./util.js');

class ParkingDataInterval {
    constructor(from, to, entry) {
        this.from = from;
        this.to = to;
        this.fetchedUris = [];
        this.entry = entry;
        this.fetchQueue = [entry];
    }

    fetch(conf = {mode: {precision: 'precise'}}) {
        conf.curDepth = 0;
        return Rx.Observable.create(observer => {
            this.fetch_rec(observer, conf);
        })
    }

    fetch_rec(observer, conf = {mode: {precision: 'precise'}, curDepth: 0}) {
        const link = this.fetchQueue.pop();
        if (link !== undefined && this.fetchedUris.indexOf(link) === -1) {
            this.fetchedUris.push(link);
            new ldfetch().get(link).then(response => {
                this.fetchedUris.push(response.url);
                const hasRangeGate = 'http://semweb.datasciencelab.be/ns/multidimensional-interface/hasRangeGate';
                if (util.filterTriples({predicate: hasRangeGate}, response.triples).length === 0) {
                    // We fetched precise data, parse and filter
                    const filtered = this.getMeasurements(response.triples);
                    let hasOverlap = false;
                    filtered.measurements.forEach(measurement => {
                        if (this.from <= measurement.timestamp && measurement.timestamp <= this.to) {
                            observer.onNext(measurement);
                            hasOverlap = true;
                        }
                    });
                    if (hasOverlap || link === this.entry) {
                        this.fetchQueue = this.fetchQueue.concat(filtered.prevLinks);
                    }
                    this.fetch_rec(observer);
                } else {
                    // We fetched a range gate, decide if we need to fetch the children
                    console.log("Recognized range gate at ", link);
                    if (conf.mode.zoomLevel !== undefined) {
                        // Go conf.mode.zoomLevel levels deep
                        if (conf.curDepth < conf.mode.zoomLevel) {
                            if (this.checkRangeGateIntervalOverlap(response.triples)) {
                                console.log("Overlap detected at ", link);
                                const subRangeGates = util.getSubRangeGatesFromTriples(response.triples);
                                subRangeGates.forEach(rg => {
                                    this.fetchQueue.push(rg);
                                });
                                conf.curDepth++;
                            }
                        } else if (conf.curDepth === conf.mode.zoomLevel) {
                            // return statistical summary data
                            console.log("Zoom level reached: ", conf.curDepth);
                            if (this.checkRangeGateIntervalOverlap(response.triples)) {
                                const stats = this.getStatisticalSummary(response.triples);
                                stats.forEach(s => observer.onNext(s));
                            }
                        }
                    } else if (conf.mode.precision === 'precise') {
                        if (this.checkRangeGateIntervalOverlap(response.triples)) {
                            console.log("Overlap detected at ", link);
                            const subRangeGates = util.getSubRangeGatesFromTriples(response.triples);
                            subRangeGates.forEach(rg => {
                                this.fetchQueue.push(rg);
                            });
                        }
                    } else if (conf.mode.precision === 'day') {
                        if (this.checkRangeGateIntervalOverlap(response.triples)) {
                            console.log("Overlap detected at ", link);
                            if (!util.checkDayLevel(response.triples)) {
                                const subRangeGates = util.getSubRangeGatesFromTriples(response.triples);
                                subRangeGates.forEach(rg => {
                                    this.fetchQueue.push(rg);
                                });
                            } else {
                                console.log("Day level detected at ", link);
                                const stats = this.getStatisticalSummary(response.triples);
                                stats.forEach(s => observer.onNext(s));
                            }
                        }
                    }
                    this.fetch_rec(observer, conf)
                }
            });
        } else if (link !== undefined) {
            this.fetch_rec(observer);
        } else {
            observer.onCompleted();
        }
    }

    checkRangeGateIntervalOverlap(triples) {
        const bounds = util.getBounds(triples);

        return bounds.init <= this.to && this.from <= bounds.final;
    }

    getStatisticalSummary(triples) {
        const pMean = 'http://datapiloten.be/vocab/timeseries#mean';
        const pMedian = 'http://datapiloten.be/vocab/timeseries#median';
        const pVariance = 'http://datapiloten.be/vocab/timeseries#variance';
        const pFirstQuartile = 'http://datapiloten.be/vocab/timeseries#firstQuartile';
        const pThirdQuartile = 'http://datapiloten.be/vocab/timeseries#thirdQuartile';
        const parkingSite = 'http://vocab.datex.org/terms#UrbanParkingSite';
        const pRdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        const pInitial = 'http://semweb.datasciencelab.be/ns/multidimensional-interface/initial';
        const pFinal = 'http://semweb.datasciencelab.be/ns/multidimensional-interface/final';
        const result = [];

        const initTriple = lodash.find(triples, t => t.predicate === pInitial);
        const finalTriple = lodash.find(triples, t => t.predicate === pFinal);

        const init = moment(n3.Util.getLiteralValue(initTriple.object)).unix();
        const final = moment(n3.Util.getLiteralValue(finalTriple.object)).unix();

        const parkings = util.filterTriples({predicate: pRdfType, object: parkingSite}, triples);
        parkings.forEach(p => {
            const mean = n3.Util.getLiteralValue(lodash.find(triples, t => t.subject === p.subject && t.predicate === pMean).object);
            const median = n3.Util.getLiteralValue(lodash.find(triples, t => t.subject === p.subject && t.predicate === pMedian).object);
            const variance = n3.Util.getLiteralValue(lodash.find(triples, t => t.subject === p.subject && t.predicate === pVariance).object);
            const firstQ = n3.Util.getLiteralValue(lodash.find(triples, t => t.subject === p.subject && t.predicate === pFirstQuartile).object);
            const thirdQ = n3.Util.getLiteralValue(lodash.find(triples, t => t.subject === p.subject && t.predicate === pThirdQuartile).object);

            result.push({
                init: init,
                final: final,
                parking: p,
                mean: mean,
                variance: variance,
                firstQuartile: firstQ,
                thirdQuartile: thirdQ,
                median: median
            });
        });

        return result;
    }

    getMeasurements(triples) {
        const _measurements = [];
        const compare = (a, b) => b.timestamp - a.timestamp;

        const vacantSpaces = 'http://vocab.datex.org/terms#parkingNumberOfVacantSpaces';
        const genTime = 'http://www.w3.org/ns/prov#generatedAtTime';
        const previous = 'http://www.w3.org/ns/hydra/core#previous';

        const parkingTriples = util.filterTriples({predicate: vacantSpaces}, triples);
        const graphs = util.filterTriples({graph: '', predicate: genTime}, triples);
        const prevLinkTriples = util.filterTriples({predicate: previous}, triples);
        const prevLinks = [];
        prevLinkTriples.forEach(triple => {
            prevLinks.push(triple.object);
        })

        for (let index = 0; index < parkingTriples.length; index++) {
            const graphTriple = lodash.find(graphs, (o) => parkingTriples[index].graph === o.subject);
            _measurements.push({
                timestamp: moment(n3.Util.getLiteralValue(graphTriple.object)).unix(),
                value: parseInt(n3.Util.getLiteralValue(parkingTriples[index].object), 10),
                parkingUrl: parkingTriples[index].subject
            });
        }
        return {
            measurements: _measurements.sort(compare),
            prevLinks: prevLinks
        }
    }
}

module.exports = ParkingDataInterval;
