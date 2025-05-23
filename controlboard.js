// We need to have helpers in here for connecting to the relay & everything

// This file will be plopped into controlboard.ejs on render
const ServerManager = {
    connectedServer: undefined,
    onStatusChangedListeners: [],
    addServer: function(name, server) {
        let servers = this.getServers();
        servers.push({'name':name,'server':server});
        this.setServers(servers);
    }, 
    removeServer: function(name) {
        let servers = this.getServers();
        let newServers = [];
        servers.forEach((entry) => {
            if(entry['name'] !== name)
                newServers.push(entry);
        });
    },
    getServers: function() {
        // [ {'name':'name', 'ip':'localhost'}, {'name':'test','ip':'127.0.0.1'}]
        if(localStorage.getItem("servers") === null)
            this.setServers([]);
        let servers = localStorage.getItem("servers");
        return JSON.parse(servers);
    },
    setServers: function(servers) {
        localStorage.setItem("servers", JSON.stringify(servers));
    },
    addListener: function(event, callback) {
        if(event === "status_changed") 
            this.onStatusChangedListeners.push(callback);
    },
    getServerAddress: function(name) {
        let toRet = "";
        this.getServers().forEach((entry) => {
            if(entry["name"] === name) {
                toRet = entry["server"];
            }
        });
        return toRet;
    },
    getServerName: function(ip) {
        let toRet = "";
        this.getServers().forEach((entry) => {
            if(entry["server"] === ip) {
                toRet = entry["name"];
            }
        });
        return toRet;
    }
};

const SocketStatus = {
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED"
}

const Relay = {
    __subscribers: {},
    socket: undefined,
    socketStatus: SocketStatus.DISCONNECTED,
    registerQueue: [],
    init: function(server) {
        Relay.socketStatus = SocketStatus.CONNECTING;
        Relay.statusUpdate(SocketStatus.CONNECTING, server);

        // Modify this to be the same as overlay!
        Relay.socket = io(server, {
            reconnection: true,
            transports: ['websocket'], // long polling doesn't work due to cors or some shiet
            upgrade: false
        });
        Relay.socket.loggedIn = false;

        Relay.socket.on("connect", () => {
            Relay.socket.emit("mncs_register");
            console.log("connected");

            setTimeout(() => {
                Relay.socket.emit("login", getCookie("token"), (status) => {
                    if(status !== "good") {
                        Relay.socket.loggedIn = false;
                        Relay.socket.close();
                        Relay.socketStatus = SocketStatus.DISCONNECTED;
                        Relay.statusUpdate(SocketStatus.DISCONNECTED, undefined);
                        ServerManager.connectedServer = undefined;
                        console.log("LOGIN FAIL");
                    } else {
                        // Only send connected event if we are logged in, otherwise the controlboard is useless
                        Relay.socket.loggedIn = true;
                        Relay.socketStatus = SocketStatus.CONNECTED;
                        ServerManager.connectedServer = server;
                        Relay.statusUpdate(SocketStatus.CONNECTED, server);
                    }
                });
            }, 500);

            Relay.socket.on("disconnect", () => {
                console.log("connect error");
                Relay.socket.loggedIn = false;
                Relay.socketStatus = SocketStatus.DISCONNECTED;
                Relay.statusUpdate(SocketStatus.DISCONNECTED, undefined);
                ServerManager.connectedServer = undefined;
            });
        });

        Relay.socket.on("connect_error", (err) => {
            Relay.socket.loggedIn = false;
            Relay.socketStatus = SocketStatus.DISCONNECTED;
            Relay.statusUpdate(SocketStatus.DISCONNECTED, undefined);
            ServerManager.connectedServer = undefined;
        });

        this.statusUpdate("INITIALIZED", ServerManager.connectedServer);
    },
    switchServer: function(server) {
        if(Relay.socketStatus === SocketStatus.CONNECTED) {
            Relay.socket.loggedIn = false;
            Relay.socket.close();
            Relay.socketStatus = SocketStatus.DISCONNECTED;
            Relay.statusUpdate(SocketStatus.DISCONNECTED, undefined);
            ServerManager.connectedServer = undefined;
        }
        setTimeout(function() {
            Relay.init(server);
        }, 1000);
    },
    statusUpdate: function(status, server) {
        ServerManager.onStatusChangedListeners.forEach((callback) => {
            if(callback instanceof Function){
                callback({"status": status, "server": server});
            }
        });
    }
};

const Match = {
    getMatch: function(callback) {
        Relay.socket.emit("get match info", callback);
    },
    /*
    bestOf
    teamSize
    matchTitle
    */
    updateMatch: function(matchOptions, callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("update match info", matchOptions, callback);
        } else
            callback({
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    },
};

const Game = {
    getGame: function(callback) {
        Relay.socket.emit("get game info", callback);
    },
    setHomeTeam: function(tteam, callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("set team", {teamnum: 0, team: tteam}, callback);
        } else
            callback({
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    },
    setAwayTeam: function(tteam, callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("set team", {teamnum: 1, team: tteam}, callback);
        } else
            callback({
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    }
};

const Teams = {
    refresh: function(cb) {
        this.getTeams((teams, err) => {
            cb(teams, err);
            sendNotification("Teams refreshed");
        });
    },
    updateTeam: function(team, callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("update team", team.name, team, callback);
        } else
            callback({
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    },
    removeTeam: function(name, callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("remove team", name, callback);
        } else
            callback({
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    },
    addTeam: function(team, callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("add team", team, callback);
        } else
            callback({
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    },
    getTeams: function(callback) {
        if(Relay.socket && Relay.socket.loggedIn) {
            Relay.socket.emit("get teams", callback);
        } else
            callback(undefined, {
                name: "NotLoggedInError",
                message: "You are not logged in."
            });
    }
}

function sendNotification(text) {
    UIkit.notification(text, {pos: 'bottom-right'});
}

// setCookie & getCookie from https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

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

// generateUUID from https://stackoverflow.com/a/8809472
function generateUUID() {
    var d = new Date().getTime();
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;
        if(d > 0){
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function sendKeepalive(server) {
    if(Relay.socket && Relay.socket.loggedIn && ServerManager.connectedServer === server) {
        $.get(server, function( data ) { });

        setTimeout(() => {
            sendKeepalive(server)
        }, 5000);
    }
}

$(() => {
    ServerManager.addListener("status_changed", (data) => {
        if(data["server"] === undefined && data["status"] === "DISCONNECTED") {
            UIkit.notification("Connection lost.", {pos: 'bottom-right'});
            $("#sidebar-status circle").attr("fill", "#f10");
            $("#sidebar-status p").text("Not connected.");
            $('.cbCurrentServerIP').each(function() {
                $(this).text("");
            });
        } else if(data["status"] !== "INITIALIZED"){
            UIkit.notification("["+data["server"]+"] " + data["status"], {pos: 'bottom-right'});
            if(data["status"] === "CONNECTING") {
                $("#sidebar-status circle").attr("fill", "#E3D531");
                $("#sidebar-status p").text("Connecting...");
            } else if(data["status"] === "CONNECTED") {
                $("#sidebar-status circle").attr("fill", "#1BD137");
                $("#sidebar-status p").text("Connected!");

                sendKeepalive(ServerManager.connectedServer);
            }
            $('.cbCurrentServerIP').each(function() {
                $(this).text(data["server"]);
            });
            $('.cbCurrentServerName').each(function() {
                $(this).text(ServerManager.getServerName(data["server"]));
            });
        }
    });
                
    $(".server-button").click((e) => {
        let name = e.target.parentElement.firstElementChild.innerText;
        Relay.switchServer(ServerManager.getServerAddress(name));
        UIkit.dropdown("#server-dropdown").hide(0);
    });

    $("#logout").click((e) => {
        setCookie("token", "");
        setCookie("server", "");
        location.reload();
    });

    setTimeout(() => {
        Relay.switchServer(getCookie("server"));
    }, 800);
});