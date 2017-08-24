const Observable = require('rxjs/Observable');
const ldfetch = require('ldfetch');
const moment = require('moment');
const lodash = require('lodash');

class SmartflandersDataQuery {
  constructor(catalog) {
    this.fetch = new ldfetch();
    this.catalog = [];
    this.buildingBlocks = {
      oDcatDataset: 'http://www.w3.org/ns/dcat#Dataset',
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
        if (this.catalog.indexOf(dl.object) === -1) {
          this.catalog.push(dl.object);
        }
      });
    });
  }

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
}

module.exports = SmartflandersDataQuery;
