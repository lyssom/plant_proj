import axios from './axios'
// import axios from 'axios';

export const login = (data: any) => {
    return axios.request({
        url: '/login',
        method: 'post',
        data
    })
}

export const register = (data: any) => {
    return axios.request({
        url: '/register',
        method: 'post',
        data
    })
}


export const getModelConfig= (data: any) => {
    return axios.request({
        url: '/get_model_config',
        method: 'post',
        data
    })
}