import callApi from "@/lib/api";

const ROOT_API = "https://samuraiposeidon.vercel.app"

export async function dataUser(hashAddress) {
    const url = `${ROOT_API}/user/${hashAddress}`
    return callApi({
        url,
        method: "GET",
    })
}

export async function editProfile(data) {
    const url = `${ROOT_API}/user/profile`
    return callApi({
        url,
        method: "PUT",
        token: true,
        data
    })
}

export async function search(q) {
    const url = `${ROOT_API}/user/search?q=${q}`
    return callApi({
        url,
        method: "GET",
    })
}

export async function setPublicKey(publicKey) {
    const url = `${ROOT_API}/user/publickey`
    return callApi({
        url,
        method: "PUT",
        token: true,
        data: { publicKey }
    })
}
 
export async function getPublicKey(hashAddress) {
    const url = `${ROOT_API}/user/${hashAddress}/publickey`
    return callApi({
        url,
        method: "GET"
    })
}