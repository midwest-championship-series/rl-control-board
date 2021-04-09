const SocketStatus = {
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED"
}

const Relay = {
    server: undefined,
    socket: undefined,
    id: undefined,
    socketStatus: SocketStatus.DISCONNECTED,
    onStatusChangedListeners: [],
    init: function(server) {
        Relay.socketStatus = SocketStatus.CONNECTING;
        Relay.statusUpdate(SocketStatus.CONNECTING, server);

        Relay.server = server;
        Relay.socket = io(server, {
            reconnection: true,
            timeout: 5000,
            transports: ['websocket'], // long polling doesn't work due to cors or some shiet
            upgrade: false
        });

        Relay.socket.on("connect", () => {
            Relay.socket.emit("mncs_register");
            Relay.id = getCookie("name");
            
            Relay.socketStatus = SocketStatus.CONNECTED;
            Relay.statusUpdate(SocketStatus.CONNECTED, server);
        });

        Relay.socket.on("disconnect", () => {
            Relay.socketStatus = SocketStatus.DISCONNECTED;
            Relay.statusUpdate(SocketStatus.DISCONNECTED, server);
        });

        Relay.socket.on("reconnect_attempt", (err) => {
            Relay.socketStatus = SocketStatus.CONNECTING;
            Relay.statusUpdate(SocketStatus.CONNECTING, server);
        });

        Relay.socket.on("reconnect_error", (err) => {
            Relay.socketStatus = SocketStatus.DISCONNECTED;
            Relay.statusUpdate(SocketStatus.DISCONNECTED, server);
        });

        Relay.socket.on("reconnect", (err) => {
            Relay.socketStatus = SocketStatus.CONNECTED;
            Relay.statusUpdate(SocketStatus.CONNECTED, server);
        });

        this.statusUpdate("INITIALIZED", server);
    },
    addListener: function(event, cb) {
        if(event === "status_changed")
            Relay.onStatusChangedListeners.push(cb);
    },
    statusUpdate: function(status, server) {
        Relay.onStatusChangedListeners.forEach((callback) => {
            if(callback instanceof Function){
                callback({"status": status, "server": server});
            }
        });
    }
};

// setCookie & getCookie from https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

class Scene extends HTMLDivElement {
    
    constructor() {
        super();
    }

    get name() {
        return this.getAttribute("name");
    }
}

customElements.define("rl-scene", Scene, { extends: 'div' });

var transitioning = false;

// Returns midpoint in seconds, accounting for speed
function transition(speed) {
    document.querySelector('#transition').playbackRate = speed;
    document.querySelector('#transition').play();
    return (document.querySelector('#transition').duration / speed) / 2
}

function updateScene(scene, delay, do_transition, transition_rate, show) {
    setTimeout(() => {
        if(!transitioning){
            if(do_transition){
                transitioning = true;
                let halfLength = transition(transition_rate);
                setTimeout(function() {
                    document.querySelectorAll('rl-scene').forEach((entry) => {
                        if(entry.getAttribute("name") === scene)
                            show ? entry.removeAttribute("hidden") : entry.setAttribute("hidden", "");
                    });
                }, halfLength * 1000);
                setTimeout(function() {
                    transitioning = false;
                }, halfLength * 1000 * 2);
            } else {
                document.querySelectorAll('rl-scene').forEach((entry) => {
                    if(entry.getAttribute("name") === scene) 
                        show ? entry.removeAttribute("hidden") : entry.setAttribute("hidden", "");
                });
                transitioning = false;
            }   
        } else {
            document.querySelectorAll('rl-scene').forEach((entry) => {
                if(entry.getAttribute("name") === scene)
                    show ? entry.removeAttribute("hidden") : entry.setAttribute("hidden", "");
            });
        }
    }, delay);
}

$(() => {
                
    Relay.addListener("status_changed", (data) => {
        if(data["status"] === "CONNECTED") {
            Relay.socket.emit("activate", Relay.id, (status) => {
                if(status !== "good") {
                    console.log("deactivating");
                    setCookie("token", "");
                    setCookie("name", "");
                    setCookie("server", "");
                    location.reload();
                }
            });

            Relay.socket.on("match ended", (match) => {
                Object.entries(scenes).forEach(([key, value]) => {
                    if(value.show.event === "mncs:match_ended")
                        updateScene(key, value.show.delay, value.show.transition, value.show.transition_rate, true);
                    else if(value.hide.event === "mncs:match_ended")
                        updateScene(key, value.hide.delay, value.hide.transition, value.hide.transition_rate, false);
                });
            });

            Relay.socket.on("game event", (ev) => {
                Object.entries(scenes).forEach(([key, value]) => {
                    if(value.show.event === ev.event)
                        updateScene(key, value.show.delay, value.show.transition, value.show.transition_rate, true);
                    else if(value.hide.event === ev.event)
                        updateScene(key, value.hide.delay, value.hide.transition, value.hide.transition_rate, false);
                });
            });

            /*
                data:
                    - transition: boolean
                    - transition_rate: number
                    - scene: string
                    - delay: number (milliseconds)
            */
            Relay.socket.on("show scene", (data) => {
                updateScene(data.scene, data.delay, data.transition, data.transition_rate, true);
            });

            Relay.socket.on("hide scene", (data) => {
                updateScene(data.scene, data.delay, data.transition, data.transition_rate, false);
            });

            Relay.socket.on("deactivate", (id) => {
                if(Relay.id === id) {
                    console.log("Deactivating");
                    // F in the chat
                    setCookie("token", "");
                    setCookie("name", "");
                    setCookie("server", "");
                    location.reload();
                }
            });
        }
    });

    console.log("Initializing " + getCookie("server"));
    Relay.init(getCookie("server"));
});