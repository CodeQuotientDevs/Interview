const { logger } = require('@/libs');
const axios = require('axios');

// criteria,
// projection,
// options,
// method

module.exports = class ExternalUserService{

    /**
     * @type {import('axios').AxiosInstance}
     */
    #axiosInstance

    /**
     * 
     * @param {string} url 
     * @param {string} token 
     */
    constructor(url, token) {
        this.#axiosInstance = axios.default.create({
            baseURL: url,
            headers: {
                'Authorization': token,
            }
        });
    }

    async getUsers(criteria, projection, options = {}) {
        const response = await this.#axiosInstance.post('/user/dbquery', {
            criteria,
            projection,
            options,
            method: 'getUser',
        });
        return response.data.data;
    }

    async getUsersInMap(criteria, projection, options = {}) {
        projection._id = 1
        const users = await this.getUsers(criteria, projection, options);
        const userMap = new Map();
        users.forEach((ele) => {
            userMap.set(ele._id, ele);
        });
        return userMap;
    }
}