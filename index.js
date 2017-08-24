const Observable = require('rxjs/Observable');
const ldfetch = require('ldfetch');
const moment = require('moment');
const lodash = require('lodash');

const catalogUrl = 'https://datapiloten.be/parking/catalog.ttl';

class SmartflandersDataQuery {
  constructor(catalog) {
    this.catalog = catalog;
    this.fetch = new ldfetch();
  }
}

module.exports = SmartflandersDataQuery;
