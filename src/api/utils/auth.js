const jwt = require('jwt-simple');
const httpStatus = require('http-status');
const moment = require('moment');

const SandBoxClass = require('../utils/sandbox');
const APIError = require('../utils/APIError');

const {
  serviceBearer: s1,
  serviceReadBearer: s2,
  serviceSandBearer: s3,
  fotobankDir,
  jwtSecret,
  uploadDir,
  FILES_SIZE,
  FILES_LIMIT,
  jwtExpirationInterval,
} = require('../../config/vars');

const sandBox = new SandBoxClass(fotobankDir);


const authorize = async (req, res, next) => {

  const apiError = { status: 403, message: 'Forbidden', error: true };
  const authHeader = req.headers.authorization;
  try {
    const checkKeys = new RegExp(`Bearer (${s1}|${s2}|${s3})`);
    const checkKeysFull = new RegExp(`Bearer (${s1})`);

    if (authHeader && checkKeys.test(authHeader)) {
      apiError.status = 400;
      apiError.message = 'route is empty';
      let { route, issand, type } = req.query;
      req.isSandBox = authHeader === `Bearer ${s3}` || issand;
      req.isFull = checkKeysFull.test(authHeader);
      if (/checkPath|zip|many|notifybot/.test(req.path)) {
        return next();
      }
      if (req.isSandBox && route &&
          (!route.match('_sand') && type !== 'fotobankupload')) {
        res.sendStatus(403);
        throw 'Forbidden';
      }
      if (route && route.endsWith('/')) {
        route = route.substring(0, route.length - 1);
      }
      if (route) {
        apiError.message = 'path is not exist';
        apiError.status = 404;
        const destination = sandBox.makeDestFolder(route, req);
        if (destination) {

          return next();
        }
      }
      if (/approve/.test(req.path)) {
        if (!req.isFull) {
          res.sendStatus(403);
          throw 'Forbidden';
        }
        return next();
      }
    }
    return res.json(apiError);
  } catch (e) {
    return next(e);
  }
};
const handleJWTFile = ({ query: { t } }, res, next, roles) => async (
    err, user, info) => {
  try {
    jwt.decode(t, jwtSecret);
    return next();
  } catch (e) {
    const apiError = new APIError({
      message: 'Unauthorized',
      status: httpStatus.UNAUTHORIZED,
    });
    apiError.status = httpStatus.FORBIDDEN;
    apiError.message = 'Forbidden';
    return next(apiError);
  }
};

const getToken = (type, data, expTime) => {
  if (type === 'file' && !expTime) {
    expTime = 2;
  }
  const playload = {
    exp: moment().add(expTime || jwtExpirationInterval, 'minutes').unix(),
    iat: moment().unix(),
    sub: `${data}`,
  };
  return jwt.encode(playload, jwtSecret);
};
module.exports = { authorize, authorizeFile: handleJWTFile, getToken };
