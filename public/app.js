const PORT = "3000";
const HOST = '127.0.0.1';
const SERVER_URL = `http://${HOST}:${PORT}`;
var map = L.map('map').setView([-33.817, 151.005], 11);
const checkboxes = document.getElementsByTagName('input');
for (const checkbox of checkboxes) {
  checkbox.addEventListener('click', async () => {
    await fetchBuses();
  })
  // disable data entry while loading
  checkbox.disabled = true;
}

// We have to set up the tiles for the map afterwards
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
// Get GTFS data for mapping
/*const headGtfs = await fetch(`/api/gtfs/head`);
const lastModified = await headGtfs.json();
if (!localStorage.getItem("last-modified-gtfs") || lastModified != localStorage.getItem("last-modified-gtfs")) {
  localStorage.setItem("last-modified-gtfs", `${lastModified}`);*/
const gtfs = await fetch(`/api/gtfs`);
for (const checkbox of checkboxes) {
  checkbox.removeAttribute('disabled');
}
//}

var markers = {};
fetchBuses();

async function fetchBuses() {
  try {
    for (const marker of Object.entries(markers)) {
      //marker[1] is the value (marker) of the key value pair
      marker[1].remove();
    }
  } catch (e) {
    
  }
  markers = {};
  const query = [];
  for (const checkbox of checkboxes) {
    if (checkbox.checked == true) {
      query.push(true);
    } else {
      query.push(false);
    }
  }
  const result = await fetch(`/api/buses?o405=${query[0]}&o405nh=${query[1]}&b7rle=${query[2]}&b10ble=${query[3]}&route=${query[4]}`);
  const data = await result.json();
  for (const bus of data) {
    markers[bus[3]] = L.marker([bus[0], bus[1]]).addTo(map);
    markers[bus[3]].on('click', async () => {
      markers[bus[3]].bindPopup(`Route ${bus[2]}<br>${bus[3]}<br>${bus[4]}<br><b>${bus[6]}</b>`);
      // Bring up route map using route from bus[2]
      /* Removing this code until I've made it more efficient with SQL
      const currShape = await fetch(`${SERVER_URL}/api/gtfs/${bus[5]}`);
      // Plot the array, where each entry looks like [lat, long]
      const line = await currShape.json();
      var currLine = L.polyline(line, {color: 'blue'}).addTo(map);
      map.on('click', () => {
        map.removeLayer(currLine);
      })*/
    })
  }
}
