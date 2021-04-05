// When you make changes here, don't forget to reinstall this package into ControlBoard and Relay!
// npm install ../Authentication --save
const validateToken = (token) => {
	if(token === "testtoken")
		return true;
	return false;
};

exports.validateToken = validateToken;