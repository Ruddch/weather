var app = {
    key: '22ae733954a262cf805d6c4a32ed71bf',

    unit: function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var userLatitude = position.coords.latitude;
                var userLongitude = position.coords.longitude;
                app.getWeather(userLatitude, userLongitude, app.renderUpdate);
            }, function () {
                console.log('Cant define geolocation');
            }, {
                enableHighAccuracy: true,
                maximumAge: 1800 * 1000,
                timeout: 10000
            });
        }

        app.weatherInfoUpdate();

        document.querySelector('.footer').addEventListener('click', function () {
            var target = event.target;
            while (target != this) {
                if (target.getAttribute('data-id')) {
                    var id = parseInt(target.getAttribute('data-id'));
                    app.getFile(id, function (obj) {
                        app.getWeather(obj.lat, obj.lon, app.renderUpdate)
                    });
                    return;
                }
                target = target.parentNode;
            }
        });
    },

    getWeather: function (lat, lon, callback) {
        var xhr = new XMLHttpRequest();
        var url = '//api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=' + app.key + '&units=metric';
        xhr.open("Get", url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState != 4) return;

            if (xhr.status != 200) {
                console.log(xhr.status + ': ' + xhr.statusText);
            } else {
                var response = JSON.parse(xhr.responseText);
                console.log(response);
                callback(response);
            }
        };

        xhr.send();
    },

    renderCity: function (obj, added) {
        app.added = added;
        app.activeId = obj.id;
        app.activeLat = obj.coord.lat;
        app.activeLon = obj.coord.lon;

        var html = ejs.render(
            '<div class="city-wrap">' +
                '<header>' +
                    '<div class="logo">-W-</div>' +
                '</header>' +
                '<main>' +
                    '<h2 class="city-name"><%= c.name; %></h2>' +
                    '<span class="add-btn">' +
                        '<img src="img/<%= !!app.added ? `remove` : `add` %>.png">' +
                    '</span>' +
                    '<div class="temperature"><%= Math.round(c.main.temp); %>°C</div>' +
                    '<div class="wind"><%= Math.round(c.wind.speed); %> m/s</div>' +
                    '<div class="pressure"><%= Math.round(c.main.pressure * 0.75006375541921); %> mmHg</div>' +
                    '<div class="humidity">humidity <%= Math.round(c.main.humidity); %>%</div>' +
                    '<div class="weather-icon">' +
                        '<span><%= c.weather[0].description; %></span>' +
                        '<img src="//openweathermap.org/img/w/<%= c.weather[0].icon; %>.png">' +
                    '</div>' +
                '</main>' +
                '<footer>' +
                    '<div class="inform-block"></div>' +
                '</footer>' +
            '</div>',
            {c: obj}
        );
        document.querySelector('.wrapper').innerHTML = html;

        document.querySelector('.add-btn').addEventListener('click', function () {
            if (!!app.added) {
                app.delFile(obj.id)
            } else {
                app.setFile({
                    id: obj.id,
                    name: obj.name,
                    lat: obj.coord.lat,
                    lon: obj.coord.lon
                })
            }
            app.renderUpdate(obj)
        })
    },

    renderUpdate: function (obj) {
        app.getFile(obj.id, function (added) {
            app.renderCity(obj, added);
        });
        app.getStorage(app.renderFooter);
    },

    weatherInfoUpdate: function() {
        setInterval( function() {
            if (app.activeLat && app.activeLon) {
                app.getWeather(app.activeLat, app.activeLon, function(obj) {
                    app.renderCity(obj, app.added)
                });
            }
        }, 60000)
    },

    renderFooter: function (list) {
        var html = ejs.render(
            '<% list.forEach( function(elem) { %>' +
                '<div class="city <%= elem.id == app.activeId ? `active` : `` %>" data-id="<%= elem.id; %>"><%= elem.name; %></div>' +
            '<% }); %>',
            {list: list}
        );
        document.querySelector('.footer').innerHTML = html;
    },

    logerr: function(err) {
        console.log(err);
    },

    connectDB: function(callback) {
        var request = indexedDB.open('cities3', 1);
        request.onsuccess = function () {
            callback(request.result);
        };
        request.onupgradeneeded = function (e) {
            e.currentTarget.result.createObjectStore('city', {keyPath: "id"});
            app.connectDB(callback);
        }
    },

    getFile: function(file, callback) {
        app.connectDB(function (db) {
            var request = db.transaction(['city'], "readonly").objectStore('city').get(file);
            request.onerror = app.logerr;
            request.onsuccess = function () {
                console.log(request.result);
                callback(request.result ? request.result : false);
            }
        });
    },

    getStorage: function(callback) {
        app.connectDB(function (db) {
            var rows = [],
                store = db.transaction(['city'], "readonly").objectStore('city');

            if (store.mozGetAll)
                store.mozGetAll().onsuccess = function (e) {
                    callback(e.target.result);
                };
            else
                store.openCursor().onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        rows.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        callback(rows);
                    }
                };
        });
    },

    setFile: function(file) {
        app.connectDB(function (db) {
            var request = db.transaction(['city'], "readwrite").objectStore('city').put(file);
            request.onerror = app.logerr;
            request.onsuccess = function () {
                return request.result;
            }
        });
    },

    delFile: function(file) {
        app.connectDB(function (db) {
            var request = db.transaction(['city'], "readwrite").objectStore('city').delete(file);
            request.onerror = app.logerr;
            request.onsuccess = function () {
                console.log("File has been deleted from DB:", file);
            }
        });
    }
};

app.unit();