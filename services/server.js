import callApi from "@/lib/api";

const ROOT_API = "https://samuraiposeidon.vercel.app"

export async function createServer(data) {
    const url = `${ROOT_API}/server/create`
    return callApi({
        url,
        method: "POST",
        data,
        token: true
    })
}

export async function getAllServers() {
    const url = `${ROOT_API}/server/all`
    return callApi({
        url,
        method: "GET",
    })
}

export async function getMyServers() {
    const url = `${ROOT_API}/server/my/server`
    return callApi({
        url,
        method: "GET",
        token: true
    })
}

export async function getDetailServer(idServer) {
    const url = `${ROOT_API}/server/${idServer}`
    return callApi({
        url,
        method: "GET"
    })
}

export async function getJoinedServers(hashAddress) {
    const url = `${ROOT_API}/server/joined/${hashAddress}`
    return callApi({
        url,
        method: "GET",
        token: true
    })
}

export async function createPostServer(idServer, data) {
    const url = `${ROOT_API}/server/${idServer}/create`
    return callApi({
        url,
        method: "POST",
        data,
        token: true
    })
}

export async function joinServer(idServer) {
    const url = `${ROOT_API}/server/${idServer}/join`
    return callApi({
        url,
        method: "PUT",
        token: true
    })
}

export async function leaveServer(idServer) {
    const url = `${ROOT_API}/server/${idServer}/leave`
    return callApi({
        url,
        method: "PUT",
        token: true
    })
}