var map;
var destMarker;
var origin;
var destination;
var directionRenderer;
var directionService;


var originCoords;
var destinationCoords;

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

    Search(originLat, originLng);
});



function Search(latitude, longitude) {
    var request = {
        type: ["hospital"],
        location: new google.maps.LatLng(latitude, longitude),
        radius: 15000
    };
    var service = new google.maps.places.PlacesService(map);

    service.nearbySearch(request, function(results, status) {
        var unregisteradHospitals = document.getElementsByClassName("UnregisterdHospitalsBody")[0];
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                let tr = document.createElement("tr");
                let td = document.createElement("td");
                td.innerText = results[i].name;
                tr.appendChild(td);
                unregisteradHospitals.appendChild(tr);
                let markerElement = createMarker(results[i]);
                td.addEventListener("click", function() {
                    originCoords = new google.maps.LatLng(origin.lat, origin.lng);
                    destinationCoords = new google.maps.LatLng(markerElement.getPosition().lat(), markerElement.getPosition().lng());

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
            color: '#ef0764',
            fontSize: '12px'
        },
        icon: icon,
        title: place.name
    });

    return marker;
}