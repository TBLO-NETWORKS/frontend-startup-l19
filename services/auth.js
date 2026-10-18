import callApi from "@/lib/api";

const ROOT_API = "https://samuraiposeidon.vercel.app"

export async function setRegister(data) {
    const url = `${ROOT_API}/auth/register`
    return callApi({
        url,
        method: "POST",
        data,
    })
}

export async function setLogin(data) {
    const url = `${ROOT_API}/auth/login`
    return callApi({
        url,
        method: "POST",
        data,
    })
}