// Node 25 removed buffer.SlowBuffer (DEP0030). Next 12's compiled
// jsonwebtoken bundle reads SlowBuffer.prototype at load time, so restore
// an alias to Buffer until Next is upgraded past 12.x.
const buffer = require('buffer');
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}
