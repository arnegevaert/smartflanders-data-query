const Rx = require('rx');
const ldfetch = require('ldfetch');
const moment = require('moment');
const lodash = require('lodash');
const n3 = require('n3');

class SmartflandersDataQuery {
  constructor() {
    this.fetch = new ldfetch();
    this._catalog = [];
    this.buildingBlocks = {
      oDcatDataset: 'http://www.w3.org/ns/dcat#Dataset',
      oDatexUrbanParkingSite: 'http://vocab.datex.org/terms#UrbanParkingSite',
      pDatexParkingNumberOfSpaces: 'http://vocab.datex.org/terms#parkingNumberOfSpaces',
      pRdfsLabel: 'http://www.w3.org/2000/01/rdf-schema#label',
      pDcatDistribution: 'http://www.w3.org/ns/dcat#distribution',
      pDcatDownloadUrl: 'http://www.w3.org/ns/dcat#downloadURL',
      pRdfType: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    }
  }

  // Interprets a DCAT catalog and saves download links
  // Returns a promise that resolves when the catalog was added
  addCatalog(catalog) {
    return this.fetch.get(catalog).then(response => {
      // Get datasets
      let datasets = this.filterTriples({
        predicate: this.buildingBlocks.pRdfType,
        object: this.buildingBlocks.oDcatDataset
      }, response.triples);

      // Get their distributions
      let distributions = [];
      datasets.forEach(d => {
        distributions = distributions.concat(this.filterTriples({
          subject: d.subject,
          predicate: this.buildingBlocks.pDcatDistribution
        }, response.triples));
      });

      // Get their download links
      let downlinks = [];
      distributions.forEach(d => {
        downlinks = downlinks.concat(this.filterTriples({
          subject: d.object,
          predicate: this.buildingBlocks.pDcatDownloadUrl
        }, response.triples));
      });

      // Add links to catalog
      downlinks.forEach(dl => {
        if (this._catalog.indexOf(dl.object) === -1) {
          this._catalog.push(dl.object);
        }
      });
    });
  }

  // Adds a simple dataset URL to the internal catalog
  addDataset(dataset) {
    if (this._catalog.indexOf(dataset) === -1) {
      this._catalog.push(dataset);
    }
  }

  // Filters a list of triples using a given template
  // Returns an array of matching triples
  filterTriples(template, triples) {
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
  }

  // Gets parkings from all datasets in catalog
  // Returns an Observable
  getParkings() {
    return Rx.Observable.create(observer => {
      this._catalog.forEach(datasetUrl => {
        this.fetch.get(datasetUrl).then(response => {
          // Get all subjects that are parkings
          const parkings = [], totalspacesParking = [], labels = [];
          response.triples.forEach(triple => {
            if (triple.object === this.buildingBlocks.oDatexUrbanParkingSite) {
              parkings.push(triple);
            }
            if (triple.predicate === this.buildingBlocks.pDatexParkingNumberOfSpaces) {
              totalspacesParking.push(triple);
            }
            if (triple.predicate === this.buildingBlocks.pRdfsLabel) {
              labels.push(triple);
            }
          });
          if (parkings.length <= 0) {
            observer.onError('No parkings found in dataset: ', datasetUrl);
          }
          parkings.forEach(parking => {
            const totalspacesresult = lodash.find(totalspacesParking, (o) => o.subject === parking.subject);
            const totalspaces = parseInt(n3.Util.getLiteralValue(totalspacesresult.object), 10);
            const labelresult = lodash.find(labels, (o) => {
              return o.subject === parking.subject
            });
            const rdfslabel = n3.Util.getLiteralValue(labelresult.object);
            const id = rdfslabel.replace(' ', '-').toLowerCase();
            const parkingObj = {
              label: rdfslabel,
              uri: parking.subject,
              id: id,
              totalSpaces: totalspaces,
              datasetUrl: datasetUrl,
            }
            observer.onNext(parkingObj);
          })
          observer.onComplete();
        });
      });
    });
  }

  getCatalog() { return this._catalog; }
}

module.exports = SmartflandersDataQuery;
