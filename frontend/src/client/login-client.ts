import logger from '@/lib/logger';
import axios, { AxiosInstance, AxiosResponse } from 'axios';


export default class LoginClient {
    private url: string;
    private _mainAPI: AxiosInstance;
    constructor (url: string) {
        this.url = url;
        this._mainAPI = axios.create({
            baseURL: this.url,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        });
    }

    async requestWrapper(promise: Promise<AxiosResponse<unknown, unknown>>) {
        try {
            const data = await promise;
            return data;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }

    async login(payload: { email: string, password: string }) {
        try {
            const response = await this._mainAPI.post('/login/', payload);
            if ('error' in response.data) {
                throw new Error(response.data.error);
            }
            return true;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }

    async loginWithGoogle(cred: string) {
        try {
            const response = await this._mainAPI.post('/login/google', {
                token: cred,
            });
            if ('error' in response.data) {
                throw new Error(response.data.error);
            }
            return true;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }

    async getSession() {
        const session = await this.requestWrapper(this._mainAPI.get('/session'));
        return session;
    }

    async generateToken() {
        const response = await this.requestWrapper(this._mainAPI.post('/token/generate', {}));
        return response.data;
    }

    async getTokens() {
        const response = await this.requestWrapper(this._mainAPI.get('/tokens'));
        return response.data;
    }

    async deleteToken(token: string) {
        const response = await this.requestWrapper(this._mainAPI.delete(`/token/${token}`));
        return response.data;
    }
}