const axios = require('axios');

const directusAPI = axios.create({
	baseURL: process.env.CMS_BASE_URL,
	headers: {
		Authorization: `Bearer ${process.env.CMS_ACCESS_TOKEN}`
	}
});

module.exports = {
	directusAPI
};