import express from 'express';
import redis from 'redis';
import 'dotenv/config';


const redisClient = redis.createClient({ legacyMode: true }); // legacy 모드 반드시 설정 !!
redisClient.on('connect', async () => {
    console.info('Redis connected!');
});
redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});
redisClient.connect().then(); // redis v4 연결 (비동기)
const redisCli = redisClient.v4;

const redisCtrl = {
    get: async (key) => {
        try {
            let result = await redisCli.get(key);
            return result;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    set: async (key, value, second = 0) => {
        try {
            await redisCli.set(key, value);
            if (second > 0) {
                await redisCli.expire(key, second);
            }
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    update: async (key, value) => {
        try {
            await redisCli.rename(key, value);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }

    },
    delete: async (key) => {
        try {
            const n = await redisCli.exists(key); // true: 1 , false: 0
            if (n) await redisCli.del(key);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    addNumber: async (key, value, second = 0) => {
        try {
            let result = await redisCli.incrBy(key, value);
            if (second > 0) {
                await redisCli.expire(key, second);
            }
            return parseFloat(result);
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    subNumber: async (key, value, second = 0) => {
        try {
            let result = await redisCli.decrBy(key, value);
            if (second > 0) {
                await redisCli.expire(key, second);
            }
            return parseFloat(result);
        } catch (err) {
            console.log(err);
            return false;
        }
    },
}

export default redisCtrl;