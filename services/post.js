import callApi from "@/lib/api";

const ROOT_API = "http://localhost:8000"

export async function getAllPosts() {
    const url = `${ROOT_API}/post/all`
    return callApi({
        url,
        method: "GET",
    })
}

export async function getPersonalPosts(userId) {
    const url = `${ROOT_API}/post/${userId}`
    return callApi({
        url,
        method: "GET",
    })
}

export async function createPost(data) {
    const url = `${ROOT_API}/post/create`
    return callApi({
        url,
        method: "POST",
        data,
        token: true
    })
}

export async function getServerPosts(idServer) {
    const url = `${ROOT_API}/post/server/${idServer}`
    return callApi({
        url,
        method: "GET",
    })
}

export async function toggleLikePost(postId) {
    const url = `${ROOT_API}/post/${postId}/like`;
    return callApi({
        url,
        method: "POST",
        token: true
    });
}

export async function checkLikePost(postId) {
    const url = `${ROOT_API}/post/${postId}/like/status`;
    return callApi({
        url,
        method: "GET",
        token: true
    });
}

export async function detailPost(postId) {
    const url = `${ROOT_API}/post/${postId}/detail`;
    return callApi({
        url,
        method: "GET",
    });
}

export async function commentPost(postId, data) {
    const url = `${ROOT_API}/post/${postId}/comment`;
    return callApi({
        url,
        method: "POST",
        data,
        token: true
    });
}

export async function deletePost(postId) {
    const url = `${ROOT_API}/post/${postId}/delete`;
    return callApi({
        url,
        method: "DELETE",
        token: true
    });
}

export async function deleteComment(commentId) {
    const url = `${ROOT_API}/post/comment/${commentId}/delete`;
    return callApi({
        url,
        method: "DELETE",
        token: true
    });
}

export async function checkManyComments(postId) {
    const url = `${ROOT_API}/post/${postId}/comment/check`;
    return callApi({
        url,
        method: "GET",
        token: true
    });
}