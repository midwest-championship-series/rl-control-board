const SocketStatus = {
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED"
}

const Relay = {
    server: undefined,
    socket: undefined,
    socketStatus: SocketStatus.DISCONNECTED,
    onStatusChangedListeners: [],
    init: function(server) {
        Relay.socketStatus = SocketStatus.CONNECTING;
        Relay.statusUpdate(SocketStatus.CONNECTING, server);

        Relay.server = server;
        Relay.socket = io(server, {
            reconnection: false,
            transports: ['websocket'], // long polling doesn't work due to cors or some shiet
            upgrade: false
        });

        Relay.socket.on("connect", () => {
            Relay.socket.emit("mncs_register");
            
            Relay.socketStatus = SocketStatus.CONNECTED;
            Relay.statusUpdate(SocketStatus.CONNECTED, server);

            Relay.socket.on("disconnect", () => {
                Relay.socketStatus = SocketStatus.DISCONNECTED;
                Relay.statusUpdate(SocketStatus.DISCONNECTED, undefined);
                server = undefined;
            });
        });

        Relay.socket.on("connect_error", (err) => {
            Relay.socketStatus = SocketStatus.DISCONNECTED;
            Relay.statusUpdate(SocketStatus.DISCONNECTED, undefined);
            server = undefined;
        });
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

// getCookie from https://www.w3schools.com/js/js_cookies.asp
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
            Object.entries(scenes).forEach(([key, value]) => {
                // key: scene
                // value: .scenes file
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
        }
    });

    console.log("Initializing " + getCookie("server"));
    Relay.init(getCookie("server"));
});