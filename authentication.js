// this is temporary i promise
const validateToken = (token) => {
	const tokens = [
		"Vp75jBPrjnhB5fW6Sft7E5Ea", 
		"7pfV4bNwqDjsHT9BArM9FY37", 
		"wTJ2bAQW9R6M89NTSaqUsAvQ", 
		"rrpW2ZT2sdF4CCv8ka6mmkeL", 
		"sceGyRn8FAJqwDEJUwAYWYLq"
	];
	if(tokens.includes(token))
		return true;
	return false;
};

exports.validateToken = validateToken;