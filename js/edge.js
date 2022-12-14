/**
 * Graph edges
 * @param {int} square move
 * @param {Vertex} vertex Next peaks
 */
function Edge(square, vertex) {
  this.square = square;
  this.vertex = vertex;
}

Edge.prototype.compareTo = function (e) {
  return this.vertex.compareTo(e.vertex);
};

Edge.Comparator = function (e1, e2) {
  if (e1 === null) {
    return e2 === null ? 0 : 1;
  }
  return e1.compareTo(e2);
};
