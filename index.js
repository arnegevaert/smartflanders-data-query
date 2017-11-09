const Rx = require('rx');
const ldfetch = require('ldfetch');
const moment = require('moment');
const lodash = require('lodash');
const n3 = require('n3');
const thr = require('throw');

const pdi = require('./parking-data-interval.js');
const util = require('./util.js');

class SmartflandersDataQuery {
    constructor() {
        this.fetch = new ldfetch();
        this._catalog = [];
        this._rangegates = {};
        this.buildingBlocks = {
            oDcatDataset: 'http://www.w3.org/ns/dcat#Dataset',
            oDatexUrbanParkingSite: 'http://vocab.datex.org/terms#UrbanParkingSite',
            pDatexParkingNumberOfSpaces: 'http://vocab.datex.org/terms#parkingNumberOfSpaces',
            pRdfsLabel: 'http://www.w3.org/2000/01/rdf-schema#label',
            pDcatDistribution: 'http://www.w3.org/ns/dcat#distribution',
            pDcatDownloadUrl: 'http://www.w3.org/ns/dcat#downloadURL',
            pRdfType: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            mdiHasRangegate: 'http://w3id.org/multidimensional-interface/ontology#hasRangeGate',
            mdiHasRangegateAlt: 'http://semweb.datasciencelab.be/ns/multidimensional-interface/hasRangeGate'
        }
    }

    // Interprets a DCAT catalog and saves download links
    // Returns a promise that resolves when the catalog was added
    // TODO this can be optimized
    addCatalog(catalog) {
        return this.fetch.get(catalog).then(response => {
            // Get datasets
            let datasets = util.filterTriples({
                predicate: this.buildingBlocks.pRdfType,
                object: this.buildingBlocks.oDcatDataset
            }, response.triples);

            // Get their distributions
            let distributions = [];
            datasets.forEach(d => {
                distributions = distributions.concat(util.filterTriples({
                    subject: d.subject,
                    predicate: this.buildingBlocks.pDcatDistribution
                }, response.triples));
            });

            // Get any rangegates (MDI entry points)
            datasets.forEach(d => {
                [this.buildingBlocks.mdiHasRangegate, this.buildingBlocks.mdiHasRangegateAlt].forEach(mdi => {
                    util.filterTriples({
                        subject: d.subject,
                        predicate: mdi
                    }, response.triples).forEach(t => {
                        // Get distribution for dataset
                        let distr = util.filterTriples({
                            subject: d.subject,
                            predicate: this.buildingBlocks.pDcatDistribution
                        }, response.triples)[0];
                        let downlink = util.filterTriples({
                            subject: distr.object,
                            predicate: this.buildingBlocks.pDcatDownloadUrl
                        }, response.triples)[0].object;
                        // Get downlink for distribution
                        this._rangegates[downlink] = t.object;
                    });
                });
            });

            // Get their download links
            let downlinks = [];
            distributions.forEach(d => {
                downlinks = downlinks.concat(util.filterTriples({
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

    // Adds an MDI entry point for a certain dataset
    addMDIEntry(dataset, rangegate) {
        if (this._catalog.includes(dataset)) {
            this._rangegates[dataset] = rangegate;
        } else {
            thr('Dataset URL not found in internal catalog: ' + dataset);
        }
    }

    removeMDIEntry(dataset) {
        delete this._rangegates[dataset];
    }

    hasMDIEntry(dataset) {
        return this._rangegates[dataset] !== undefined;
    }

    MDIEntryToOriginal(url) {
        let result = false;
        Object.keys(this._rangegates).forEach(key => {
            if (this._rangegates[key] === url) result = key;
        });
        return result;
    }

    getMDIEntry(dataset) {
        return this._rangegates[dataset];
    }

    // Gets parkings from all datasets in catalog
    // Returns an Observable
    getParkings() {
        return Rx.Observable.create(observer => {
            let barrier = {};
            this._catalog.forEach(url => {
                if (this.hasMDIEntry(url)) {
                    barrier[this.getMDIEntry(url)] = false
                } else {
                    barrier[url] = false;
                }
            });

            let getParkingsForDataset = datasetUrl => {
                this.fetch.get(datasetUrl).then(response => {
                    // Get all subjects that are parkings
                    const parkings = util.filterTriples({object: this.buildingBlocks.oDatexUrbanParkingSite}, response.triples);
                    const totalspaces = util.filterTriples({predicate: this.buildingBlocks.pDatexParkingNumberOfSpaces}, response.triples);
                    const labels = util.filterTriples({predicate: this.buildingBlocks.pRdfsLabel}, response.triples);
                    if (parkings.length <= 0) {
                        observer.onError('No parkings found in dataset: ', datasetUrl);
                    }
                    parkings.forEach(parking => {
                        const totalspacesresult = lodash.find(totalspaces, (o) => o.subject === parking.subject);
                        const totalspacesParking = parseInt(n3.Util.getLiteralValue(totalspacesresult.object), 10);
                        const labelresult = lodash.find(labels, (o) => {
                            return o.subject === parking.subject
                        });
                        const rdfslabel = n3.Util.getLiteralValue(labelresult.object);
                        const parkingObj = {
                            label: rdfslabel,
                            '@id': parking.subject,
                            totalSpaces: totalspacesParking,
                            dataset: {'@id': datasetUrl},
                        };
                        observer.onNext(parkingObj);
                    });
                    barrier[datasetUrl] = true;
                    let finished = true;
                    Object.keys(barrier).forEach(key => {
                        if (barrier[key] === false) finished = false
                    });
                    if (finished) {
                        observer.onCompleted();
                    }
                }).catch(error => {
                    let orig = this.MDIEntryToOriginal(datasetUrl);
                    if (orig) {
                        this.removeMDIEntry(datasetUrl);
                        getParkingsForDataset(orig);
                    } else {
                        barrier[datasetUrl] = true;
                        let finished = true;
                        Object.keys(barrier).forEach(key => {
                            if (barrier[key] === false) finished = false
                        });
                        if (finished) {
                            observer.onCompleted();
                        }
                    }
                });
            };

            this._catalog.forEach(datasetUrl => {
                // If we have an MDI entry point, use that one
                if (this.hasMDIEntry(datasetUrl)) {
                    datasetUrl = this.getMDIEntry(datasetUrl);
                }
                getParkingsForDataset(datasetUrl);
            });
        });
    }


    // Gets an interval of data for the entire catalog
    // Returns an observable
    // conf: mode: precision: 'precise': get exact data from leaf level (default)
    //                        'day': get data per day (1 level above leaf)
    //             zoomLevel: go up to zoomLevel levels deep (leaf if zoomLevel exceeds actual depth) (overrides precision)
    getInterval(from, to, conf = {mode: {precision: 'precise'}}) {
        let barrier = {};
        this._catalog.forEach(url => {
            if (this.hasMDIEntry(url)) {
                barrier[this.getMDIEntry(url)] = false;
            } else {
                barrier[url] = false;
            }
        });

        return Rx.Observable.create(observer => {
            this._catalog.forEach(dataset => {
                let entry = dataset + '?time=' + moment.unix(to).format('YYYY-MM-DDTHH:mm:ss');
                let alt = false;
                if (this.hasMDIEntry(dataset)) {
                    alt = entry;
                    entry = this.getMDIEntry(dataset);
                }
                let pdiInstance = new pdi(from, to, entry);
                if (alt) pdiInstance.addAlternative(alt);
                pdiInstance.fetch(conf).subscribe(meas => {
                    observer.onNext(meas);
                }, (error) => observer.onError(error), () => {
                    barrier[dataset] = true;
                    let done = true;
                    Object.keys(barrier).forEach(key => {
                        if (!barrier[key]) {
                            done = false;
                        }
                    });
                    if (done) observer.onCompleted();
                })
            })
        })
    }

    // Gets an interval of data for a dataset
    // Returns an Observable
    getDatasetInterval(from, to, datasetUrl, conf = {mode: {precision: 'precise'}}) {
        let entry = datasetUrl + '?time=' + moment.unix(to).format('YYYY-MM-DDTHH:mm:ss');
        let alt = false;
        if (this.hasMDIEntry(datasetUrl)) {
            alt = entry;
            entry = this.getMDIEntry(datasetUrl);
        }
        let pdiInstance = new pdi(from, to, entry);
        if (alt) pdiInstance.addAlternative(alt);
        return pdiInstance.fetch(conf);
    }

    // Gets an interval of data for one parking
    // Returns an Observable
    getParkingInterval(from, to, datasetUrl, uri, conf = {mode: {precision: 'precise'}}) {
        let entry = datasetUrl + '?time=' + moment.unix(to).format('YYYY-MM-DDTHH:mm:ss');
        let alt = false;
        if (this.hasMDIEntry(datasetUrl)) {
            alt = entry;
            entry = this.getMDIEntry(datasetUrl);
        }
        let pdiInstance = new pdi(from, to, entry);
        if (alt) pdiInstance.addAlternative(alt);
        return Rx.Observable.create(observer => {
            pdiInstance.fetch(conf).subscribe(meas => {
                if (meas.parkingUrl === uri) {
                    observer.onNext(meas);
                }
            }, (error) => observer.onError(error), () => observer.onCompleted());
        });
    }

    getCatalog() {
        return this._catalog;
    }
}

module.exports = SmartflandersDataQuery;
