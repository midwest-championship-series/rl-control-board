
function validateToken(token) {
	const tokens = [
		"Vp75jBPrjnhB5fW6Sft7E5Ea", 
		"7pfV4bNwqDjsHT9BArM9FY37", 
		"wTJ2bAQW9R6M89NTSaqUsAvQ", 
		"rrpW2ZT2sdF4CCv8ka6mmkeL", 
		"sceGyRn8FAJqwDEJUwAYWYLq",
		(process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "docker" ? "testtoken" : "AzceGraRngFAJtwDEqqwAjWsLq")
	];
	if(tokens.includes(token))
		return true;
	return false;
};

exports.validateToken = validateToken;