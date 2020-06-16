var map;
var destMarker;
var origin;
var destination;
var directionRenderer;
var directionService;


var originCoords;
var destinationCoords;

var registeredHospitals = [];


function initMap() {

    map = new google.maps.Map(document.getElementById('map'), {

        center: {
            lat: 44.437,
            lng: 26.024
        },
        zoom: 7
    });
    directionService = new google.maps.DirectionsService();
    directionRenderer = new google.maps.DirectionsRenderer();
    directionRenderer.setMap(map);
    directionRenderer.setPanel(document.getElementById('directionsPanel'));
    destMarker = new google.maps.Marker({
        map: map,
        animation: google.maps.Animation.DROP
    });

    map.addListener('click', function(mapsMouseEvent) {
        originCoords = new google.maps.LatLng(origin.lat, origin.lng);
        destinationCoords = mapsMouseEvent.latLng;
        let request = {
            origin: originCoords,
            destination: destinationCoords,
            travelMode: "WALKING"
        }
        directionService.route(request, function(result, status) {
            if (status == "OK") {
                directionRenderer.setDirections(result);
            }
        })
    });
}



function callback(response, status) {
    let res = document.createElement("p");
    let json = response;
    res.innerText = JSON.stringify(json["rows"][0]["elements"][0]);
    document.getElementsByTagName("BODY")[0].appendChild(res);
}

var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
};

navigator.geolocation.getCurrentPosition(function(location) {
    let originLng = location.coords.longitude;
    let originLat = location.coords.latitude;
    map.setCenter({
        lat: originLat,
        lng: originLng
    });
    origin = {
        lat: originLat,
        lng: originLng
    };
    map.setZoom(14);
    var selfMarker = new google.maps.Marker({
        position: {
            lat: originLat,
            lng: originLng
        },
        map: map,
        animation: google.maps.Animation.DROP
    });

    RegisteredHospitals(originLat, originLng);


}, function(err) { console.log(err) }, options);

function RegisteredHospitals(lat, lng) {
    revGeolocationReq = new XMLHttpRequest()
    revGeolocationReq.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var county = "";
            try {
                let res = JSON.parse(this.response);
                res = res["results"][0]["address_components"];
                for (var i = 0; i < res.length; i++) {
                    if (res[i]["types"][0] == "administrative_area_level_1") {
                        county = res[i]["short_name"];
                    }
                }
            } catch (error) {
                console.log(error);
            }
            console.log(county);
            if (county != "" && county != null) {
                hospitalsRequest = new XMLHttpRequest();
                hospitalsRequest.onreadystatechange = function() {
                    if (this.readyState == 4 && this.status == 200) {
                        registeredHospitals = JSON.parse(this.response);
                        Search(lat, lng);
                    }
                }

                hospitalsRequest.open("GET", "https://cc2020project.appspot.com/getHospitals", true);
                hospitalsRequest.setRequestHeader("code", county);
                hospitalsRequest.send();

            }
        }
    };
    revGeolocationReq.open("POST", "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&key=AIzaSyCLMI60gh3A2gk8NGXtsB8_HUymue0ERpU", true);
    revGeolocationReq.send();
}

function Search(latitude, longitude) {
    var request = {
        type: ["hospital"],
        location: new google.maps.LatLng(latitude, longitude),
        radius: 15000
    };
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, function(results, status) {
        var unregisteredHospitalsTabel = document.getElementsByClassName("UnregisterdHospitalsBody")[0];
        var registeredHospitalsTabel = document.getElementsByClassName("RegisteredHospitalsBody")[0];
        console.log(registeredHospitals);
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                let tr = document.createElement("tr");
                let td = document.createElement("td");
                td.innerText = results[i].name;
                tr.appendChild(td);
                if (registeredHospitals.includes(results[i].name.replace(/\"/g, ""))) {
                    console.log("yes");
                    registeredHospitalsTabel.appendChild(tr);
                } else {
                    unregisteredHospitalsTabel.appendChild(tr);
                }
                let markerElement = createMarker(results[i]);
                google.maps.event.addListener(markerElement, 'click', function() {
                    originCoords = new google.maps.LatLng(origin.lat, origin.lng);
                    destinationCoords = new google.maps.LatLng(markerElement.getPosition().lat(), markerElement.getPosition().lng());

                    let request = {
                        origin: originCoords,
                        destination: destinationCoords,
                        travelMode: document.getElementById("mode").value
                    }
                    directionService.route(request, function(result, status) {
                        if (status == "OK") {
                            directionRenderer.setDirections(result);
                        }
                    })
                });
                td.addEventListener("click", function() {
                    originCoords = new google.maps.LatLng(origin.lat, origin.lng);
                    destinationCoords = new google.maps.LatLng(markerElement.getPosition().lat(), markerElement.getPosition().lng());

                    let request = {
                        origin: originCoords,
                        destination: destinationCoords,
                        travelMode: document.getElementById("mode").value
                    }
                    directionService.route(request, function(result, status) {
                        if (status == "OK") {
                            directionRenderer.setDirections(result);
                        }
                    })
                });
            }
        }
    });
}

function GetDirections() {

    if (directionService) {
        let request = {
            origin: originCoords,
            destination: destinationCoords,
            travelMode: document.getElementById("mode").value
        }
        directionService.route(request, function(result, status) {
            if (status == "OK") {
                directionRenderer.setDirections(result);
            }
        })
    }

}

function createMarker(place) {
    var icon = {
        url: "images/hospitalsvg.svg",
        scaledSize: new google.maps.Size(20, 20),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 0),
        labelOrigin: { x: 12, y: -10 }
    };

    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        label: {
            text: place.name,
            color: '#FF3B3F',
            fontSize: '12px'
        },
        icon: icon,
        title: place.name
    });

    return marker;
}