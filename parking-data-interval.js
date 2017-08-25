const Rx = require('rx');
const ldfetch = require('ldfetch');
const n3 = require('n3');
const moment = require('moment');
const lodash = require('lodash');

const util = require('./util.js')

class ParkingDataInterval {
  constructor(from, to, entry) {
    this.from = from;
    this.to = to;
    this.fetchedUris = [];
    this.entry = entry;
    this.fetchQueue = [entry];
  }

  fetch() {
    return Rx.Observable.create(observer => {
      this.fetch_rec(observer);
    })
  }

  fetch_rec(observer) {
    const link = this.fetchQueue.pop();
    if (link !== undefined && this.fetchedUris.indexOf(link) === -1) {
      this.fetchedUris.push(link);
      new ldfetch().get(link).then(response => {
        this.fetchedUris.push(response.url);
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
      });
    } else if (link !== undefined) {
      this.fetch_rec(observer);
    } else {
      observer.onCompleted();
    }
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
