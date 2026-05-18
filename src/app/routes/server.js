const token = "";
const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.IP || '127.0.0.1';
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fs from 'fs';
import StreamZip from 'node-stream-zip';
import readCsv from 'gtfs-utils/read-csv.js';
dotenv.config();
const app = express();
app.use(express.static('public'));
app.use(cors());
const specialRoutes = [
    ["3036", "Forms 590 to Hornsby (9:16am to 9:35am) and 590 to Pennant Hills (9:40am to 9:56am)"],
    ["3587", "Forms 642X to Dural Round Corner (5:30pm to 6:39pm)"],
    ["3141", "Forms 626 to Cherrybrook Station (8:30am to 9:45am)"],
    ["5631", "Forms 5548 and then 668 to Glossodia (4:28pm to 5:05pm)"],
    ["4569", "Forms 780 to Mt Druitt (5:04pm to 5:46pm) and then 776 to Penrith (5:57pm to 6:54pm)"],
    ["4609", "Forms 795 to Warragamba (4:33pm to 5:21pm)"],
    ["5578", "Forms 677 to Penrith (5:28pm to 6:18pm)"],
    ["5085", "Forms 680 to Richmond via Bowen Mountain (8:33am to 9:24am)"],
    ["5116", "Forms 672 to Windsor via Pitt Town (8:40am to 9:16am)"],
    ["5586", "Forms 677 to Londonderry (3:50pm to 4:25pm), 672 Windsor Loop via Pitt Town (4:49pm to 5:45pm)"],
]
const O405list = [
  "MO5166",
  "MO5167",
  "MO5162",
  "MO5164",
  "MO5165",
  "MO5169",
  "MO5172",
  "MO5150",
  "MO5149",
  "MO5206",
  "MO5146",
  "MO5208",
  "MO5141",
  "MO5228",
  "MO5160",
  "MO5156",
  "MO5157",
  "MO5144",
  "MO5213",
  "MO5211",
  "MO1446",
]
const O405nhlist = [
  "MO7398",
  "MO7357",
  "MO7359",
  "MO7518",
  "MO7520",
  "MO7543",
  "MO8446",
]
const B10blelist = [
  "MO100",
  "MO1056",
  "MO1061",
  "MO1057",
  "MO1085",
  "MO1086",
  "MO1088",
  "MO1091",
  "MO1440",
  "MO1441",
  "MO1443",
  "MO1447",
  "MO1448",
  "MO1450",
  "MO1451",
  "MO1458",
  "MO1480",
  "MO8270",
  "MO8334",
  "MO8336",
  "MO8338",
  "MO8339",
  "MO8340",
  "MO8341",
  "MO8342",
  "MO8344",
  "MO8465",
  "MO8470",
  "MO8471",
  "MO8682",
  "MO8834",
  "MO8835",
]
const B7rlelist = [
  "MO1476",
  "MO1477",
  "MO1478",
  "MO1479",
  "MO8271",
  "MO8272",
  "MO8273",
  "MO8430",
  "MO8431",
  "MO8434",
  "MO8439",
  "MO8452",
  "MO8453",
  "MO8460",
  "MO8461",
]

app.get('/api/buses', async (req, res) => {
    const zip = new StreamZip.async({ file: "gtfs.zip" });
    // Define readFile function as per GTFS spec
    const readFile = async (name) => {
        const file = await zip.stream(name + '.txt');
        return await readCsv(file);
    }
    const result = [];
    const response = await fetch('https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses', {
        method: 'GET',
        headers: {
            'Content-type': 'application/json',
            'accept': 'application/x-google-protobuf',
            'Authorization': `apikey ${token}`
        },
    });
    if (response.status != 200) {
        throw new Error(response.status);
    }
    const buffer = await response.arrayBuffer();
    if (buffer.error) {
        console.error(buffer.error);
    } else {
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );
        let count = 0;
        const route = (req.query.route === 'true');
        let busType = "";
        for await (const entity of feed.entity) {
            if (O405list.includes(entity.vehicle.vehicle.licensePlate) && req.query.o405 === 'true') {
                console.log("O405 in service!");
                busType = "Mercedes-Benz O405";
            } else if (O405nhlist.includes(entity.vehicle.vehicle.licensePlate) && req.query.o405nh === 'true') {
                console.log("O405NH in service!");
                busType = "Mercedes-Benz O405NH";
            } else if (B10blelist.includes(entity.vehicle.vehicle.licensePlate) && req.query.b10ble === 'true') {
                console.log("B10BLE in service!\n");
                busType = "Volvo B10BLE";
            } else if (B7rlelist.includes(entity.vehicle.vehicle.licensePlate) && req.query.b7rle === 'true') {
                console.log("B7RLE in service!\n");
                busType = "Volvo B7RLE";
            } else {
                continue;
            }
            count++;
            // Find route and see if in "Sydney Buses Network" or "School Buses"
            let routeService = false;
            for await (const route of await readFile('routes')) {
                if (route.route_id == entity.vehicle.trip.routeId) {
                    if (route.route_desc != "School Buses") {
                        routeService = true;
                        console.log("ROUTE SERVICE\n");
                    } else {
                        console.log("School Service\n");
                    }
                    break;
                }
            }
            let specialRoute = "";
            for (let i = 0; i < specialRoutes.length; i++) {
                if (specialRoutes[i][0] == route) {
                    specialRoute = specialRoutes[i][1];
                    console.log("WILL BE A ROUTE SERVICE\n");
                    break;
                }
            }
            if (routeService && req.query.route === 'true' || req.query.route === 'false') {
                result.push([entity.vehicle.position.latitude, entity.vehicle.position.longitude, RegExp("_(.*)$").exec(entity.vehicle.trip.routeId)[1], entity.vehicle.vehicle.licensePlate, busType, entity.vehicle.trip.tripId, specialRoute]);
            }
        }
        if (!count) {
            console.log("No interesting buses found");
        }
        return res.status(200).json(result);
    }
    return res.status(403);
});

app.get('/api/gtfs/head', async (req, res) => {
    // To prevent downloading ALL of this needlessly, we can use the head operation to get just the metadata and compare
    const metadata = await fetch('https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses', {
        method: 'HEAD',
        headers: {
            Accept: 'application/octet-stream',
            Authorization: `apikey ${token}`,
        },
    });
    return res.status(200).json(metadata.headers.get("last-modified"));
});

app.get('/api/gtfs', async (req, res) => {
    const result = await fetch(`https://api.transport.nsw.gov.au/v1/gtfs/schedule/buses`, {
        method: 'GET',
        headers: {
            Accept: 'application/octet-stream',
            Authorization: `apikey ${token}`,
        },
    });
    const buffer = Buffer.from(await result.arrayBuffer());
    fs.writeFileSync("gtfs.zip", buffer);

    return res.status(200).json({});
});

app.get(`/api/gtfs/:tripId`, async (req, res) => {
    const tripId = req.params.tripId;
    const zip = new StreamZip.async({ file: "gtfs.zip" });
    // Define readFile function as per GTFS spec
    const readFile = async (name) => {
        const file = await zip.stream(name + '.txt');
        return await readCsv(file);
    }
    let shapeId = null;
    for await (const trip of await readFile('trips')) {
        if (trip.trip_id == tripId) {
            shapeId = trip.shape_id;
            break;
        }
    }
    if (shapeId != null) {
        const result = []
        for await (const point of await readFile('shapes')) {
            if (point.shape_id == shapeId) {
                result.push([point.shape_pt_lat, point.shape_pt_lon]);
            }
        }
        return res.status(200).json(result);
    } else {
        console.log (`No shape found for route ${tripId}`);
        return res.status(200).json([]);
    }
});

const server = app.listen(3000, () => {
    // DO NOT CHANGE THIS LINE
    console.log(`⚡️ Server started on port ${PORT}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
    server.close(() => {
        console.log('Shutting down server gracefully.');
        process.exit();
    });
});
