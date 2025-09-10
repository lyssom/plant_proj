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


export const getLocationMsg= () => {
    return axios.request({
        url: '/location_msg',
        method: 'get',
    })
}


export const computePlantsData= (data: any) => {
    return axios.request({
        url: '/plants_data',
        method: 'post',
        data
    })
}


export const getUsers = () => {
    return axios.request({
        url: '/api/users',
        method: 'get',
    })
}



export const deleteUser = (data: any) => {
    return axios.request({
        url: '/api/delete_user',
        method: 'post',
        data
    })
}


export const getPlants= () => {
    return axios.request({
        url: '/api/plants',
        method: 'get',
    })
}

export const createPlant= (data: any) => {
    return axios.request({
        url: '/api/create_plant',
        method: 'post',
        data
    })
}

export const updatePlant= (data: any) => {
    return axios.request({
        url: '/api/update_plant',
        method: 'post',
        data
    })
} 

export const deletePlant= (data: any) => {
    return axios.request({
        url: '/api/delete_plant',
        method: 'post',
        data
    })
}




export const getReserves= () => {
    return axios.request({
        url: '/api/reserves',
        method: 'get',
    })
}

export const createReserve = (data: any) => {
    return axios.request({
        url: '/api/create_reserve',
        method: 'post',
        data
    })
}

export const updateReserve = (data: any) => {
    return axios.request({
        url: '/api/update_reserve',
        method: 'post',
        data
    })
} 

export const deleteReserve = (data: any) => {
    return axios.request({
        url: '/api/delete_reserve',
        method: 'post',
        data
    })
}



export const saveImage = (data: any) => {
    return axios.request({
        url: '/api/save_image',
        method: 'post',
        data,
        responseType: 'blob',
    })
}


export const savePdf = (data: any) => {
    return axios.request({
        url: '/api/save_pdf',
        method: 'post',
        data,
        responseType: 'blob',
        timeout: 120000       // 可选：2 分钟超时，防止大文件被截断
    })
}

