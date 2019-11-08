import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { config } from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import routes from './routes/index.routes'

config();

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/api/v1', routes);

// error handling
app.use((req, res, next) => {
    const err = new Error('endpoint does not exist');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    console.error(
        `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
    );
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'internal server error',
    });
    next();
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port} \n`));
