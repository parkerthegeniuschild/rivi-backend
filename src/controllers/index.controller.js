import hasher from 'crypto';
import amqp from 'amqplib';
import Helper from "../helpers/index.helper";

export default class FlightController {

    static welcome(req, res) {
        return res.status(200).send({
            status: 'success',
            data: 'welcome to Rivi'
        });
    };

    static async search(req, res) {
        try {
            // create hash with data and ISO date
            const payload = {
                from: req.body.from,
                to: req.body.to,
                date: new Date(Date.now()).toISOString()
            };

            const hash = hasher
                .createHash('sha256')
                .update(JSON.stringify(payload))
                .digest('hex');

            // load the db
            const database = await Helper.loadDataFromDB();

            // auto-incrementing the id
            const id = (database.length === 0) ? 1 : database[database.length - 1].id + 1;

            // save new data to db
            database.push({ id, hash });
            await Helper.saveDataToDatabase(database);

            res.status(201).json({
                status: 'success',
                hash
            });

            // pass this data to async worker
            const data = {
                from: req.body.from,
                to: req.body.to,
                hash,
            };

            await FlightController.asyncWorker(data);
        } catch (err) {
            return res.status(500).json({
                status: 'error',
                error: err.message
            });
        }
    };

    static async asyncWorker(data) {
        (async () => {

            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            const open = amqp.connect('amqp://localhost');
            const q = 'flights';

            // Publisher
            open.then((conn) => {
                process.once('SIGINT', conn.close.bind(conn));
                return conn.createChannel();
            }).then((ch) => {
                return ch.assertQueue(q).then(() => {
                    console.log(`[*] Request sent to worker thread: ${JSON.stringify(data)} \n`);
                    return ch.sendToQueue(q, new Buffer.from(JSON.stringify(data)), { persistent: true });
                });
            }).catch(console.warn);

            // make the thread sleep for 15s but don't block the event loop
            await sleep(15000);

            // Consumer
            open.then((conn) => {
                process.once('SIGINT', conn.close.bind(conn));
                return conn.createChannel();
            }).then((ch) => {
                return ch.assertQueue(q, { durable: true })
                    .then(() => {
                    console.log(`[*] Retrieving requests in "${q}" \n`);
                    return ch.consume(q, (msg) => {
                        if (msg !== null) {
                            console.log(`[x] Received ${msg.content.toString()} \n`);
                            ch.ack(msg);
                        }
                        // save data to the database
                        FlightController.saveOne(msg.content.toString())
                    });
                });
            }).catch(console.warn);
        })();
    };

    static async saveOne(msg) {
        try {
            const sampleData = {
                ...JSON.parse(msg),
                price: Math.floor(Math.random() * 10000) + 1358,
                departure: new Date(),
                arrival: new Date(),
            };

            // load the db
            const database = await Helper.loadDataFromDB();
            const index = database.findIndex(item => item.hash === sampleData['hash']);

            // delete the hash
            delete sampleData['hash'];

            // update the data
            database[index]['data'] = sampleData;

            // persist the changes
            await Helper.saveDataToDatabase(database);
        } catch (err) {
            throw new Error(err)
        }
    };

    static async getOne(req, res) {
        try {
            const { hash } = req.query;

            // load the db
            const database = await Helper.loadDataFromDB();

            const flight = await database.find(item => item.hash === hash);

            // return error if hash does not exist
            if (!flight) {
                return res.status(404).json({
                    status: 'error',
                    error: 'hash value not found'
                });
            }

            // if flight data is not available ...
            if (!flight['data']) {

                console.log('[x] Flight data not available. Try again later...\n');

                // ... "flight" object will contain only hash value & id
                return res.status(200).json({
                    status: 'success',
                    data: flight
                });
            }

            // if flight data is available, "flight" object will contain all data
            res.status(200).json({
                status: 'success',
                data: flight
            });

            // delete data from database
            await FlightController.deleteOne(res, hash);

        } catch(err) {
            return res.status(500).json({
                status: 'error',
                error: err.message
            });
        }
    };

    static async deleteOne(res, hash) {
        try {
            // load the database
            const database = await Helper.loadDataFromDB();

            // find that particular hash's index
            const index = database.findIndex(item => item.hash === hash);

            // delete the data
            if (index > -1) {
                database.splice(index, 1);

                // persist the changes
                await Helper.saveDataToDatabase(database);
                return console.log('[*] Flight data has been deleted...\n')
            }
        } catch (err) {
            return res.status(500).json({
                status: 'error',
                error: err.message
            });
        }
    }
}
