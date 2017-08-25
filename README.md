# Smartflanders Data Query
Smartflanders-data-query is a library that lets you query the Smartflanders datasets for historic Linked Open Data. It accepts a simple dataset URL, or a URL to a [DCAT catalog](https://www.w3.org/TR/vocab-dcat/) describing one or more datasets. An example of such a catalog for the Smartflanders datasets can be found [here](https://datapiloten.be/parking/catalog.ttl).

## Installation
For Node.js, smartflanders-data-query comes as an npm package.

``` bash
$ npm install smartflanders-data-query
```
``` js
var query = require('smartflanders-data-query');
```

## Interface
- `addCatalog(catalog)`
- `getCatalog()`
- `addDataset(dataset)`
- `getParkings()`
- `getInterval(from, to)`
- `getDatasetInterval(from, to, datasetUrl)`
- `getParkingInterval(from, to, datasetUrl, uri)`

## Example usage
Below are some examples of usages of this library:

### Example 1

### Example 2

### Example 3
