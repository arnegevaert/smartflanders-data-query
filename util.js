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
}
