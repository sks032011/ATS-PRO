import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',//gets the onrender api from vercel
    timeout: 30000,
});


// .use(
//    successHandler,
//    errorHandler
// )
API.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("api Error:", error.response ? error.response.data : error.message);
        return Promise.reject(error);//pass the failed state to component catch blocks
    }
);

export const uploadResume = (formData) => API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' } //to backend itwill send multipart form data...it will convert it to binary buffer (req.file.buffer)
});

export const searchCandidates = (query) => API.post('/upload/search', query);//
export const fetchAllCandidates = () => API.get('/upload');//https://xyz.onrender.com/api/upload
export const deleteCandidate = (id) => API.delete(`/upload/${id}`);

export const analyzeResume = (formData) => API.post('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export default API;