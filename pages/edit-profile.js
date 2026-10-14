import { useState, useEffect } from "react";
import { editProfile, dataUser } from "@/services/user";
import { toast } from "react-toastify";
import { ChevronRight, ImagePlus } from "lucide-react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import ConnectWallet from "@/components/connectWallet";

const initialProfile = {
    displayName: "",
    bio: "",
    nameLink1: "",
    link1: "",
    nameLink2: "",
    link2: "",
    nameLink3: "",
    link3: "",
};

function ProfileRow({ label, value, placeholder, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center justify-between gap-4 py-3 border-b border-gray-200 dark:border-gray-600 text-left hover:bg-blue-50/60 dark:hover:bg-gray-700 transition-colors rounded-md px-2 -mx-2"
        >
            <span className="text-sm text-gray-500 dark:text-gray-300 shrink-0">{label}</span>
            <span
                className={`flex-1 text-right text-sm truncate ${
                    value ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-400"
                }`}
            >
                {value || placeholder}
            </span>
            <ChevronRight className="w-4 h-4 text-blue-400 dark:text-blue-300 shrink-0" />
        </button>
    );
}

function EditFieldModal({ open, label, value, placeholder, onSave, onClose, multiline }) {
    const [draft, setDraft] = useState(value);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-gray-900/40 dark:bg-black/70 px-4">
            <div className="w-full md:w-96 bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl p-5 border border-gray-200 dark:border-gray-600 shadow-xl dark:shadow-black/50">
                <h3 className="text-gray-900 dark:text-white text-sm font-medium mb-3">{label}</h3>
                {multiline ? (
                    <textarea
                        autoFocus
                        rows={4}
                        value={draft}
                        placeholder={placeholder}
                        onChange={(e) => setDraft(e.target.value)}
                        className="w-full resize-none rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white dark:placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                    />
                ) : (
                    <input
                        autoFocus
                        type="text"
                        value={draft}
                        placeholder={placeholder}
                        onChange={(e) => setDraft(e.target.value)}
                        className="w-full rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white dark:placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                    />
                )}
                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-lg py-2 text-sm text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSave(draft);
                            onClose();
                        }}
                        className="flex-1 rounded-lg py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

const EditProfile = () => {
    const [profile, setProfile] = useState(initialProfile);
    const [originalProfile, setOriginalProfile] = useState(initialProfile);
    const [avatar, setAvatar] = useState(null);
    const [editing, setEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const fieldMeta = {
        displayName: { label: "Display Name" },
        bio: { label: "Bio", multiline: true },
        nameLink1: { label: "Link 1 Name" },
        link1: { label: "Link 1 URL" },
        nameLink2: { label: "Link 2 Name" },
        link2: { label: "Link 2 URL" },
        nameLink3: { label: "Link 3 Name" },
        link3: { label: "Link 3 URL" },
    };

    const fallbackPlaceholder = {
        displayName: "Add display name",
        bio: "Add bio",
        nameLink1: "Add link name",
        link1: "Add link",
        nameLink2: "Add link name",
        link2: "Add link",
        nameLink3: "Add link name",
        link3: "Add link",
    };

    const getPlaceholder = (key) => originalProfile[key] || fallbackPlaceholder[key];

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setAvatar(URL.createObjectURL(file));
    };

    const handleSave = (key, val) => {
        setProfile((prev) => ({ ...prev, [key]: val }));
    };

    const handleEditProfile = async () => {
        setSubmitting(true);
        try {
            const payload = { ...originalProfile, ...profile };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === "" && originalProfile[key]) {
                    payload[key] = originalProfile[key];
                }
            });

            await editProfile(payload);
            toast.success("Profile updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update profile");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = Cookies.get("token");
                if (!token) {
                    setLoading(false);
                    return;
                }
                const jwtToken = atob(token);
                const payload = jwtDecode(jwtToken);
                const hashAddress = payload.hash;

                const response = await dataUser(hashAddress);
                if (response) {
                    setOriginalProfile((prev) => ({ ...prev, ...response.data }));
                    if (response.data.avatar) setAvatar(response.data.avatar);
                }
            } catch (err) {
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col gap-2 md:flex-row pb-12 transition-colors">
            <div className="w-full md:w-2/3 border-0 md:border-r border-gray-200 dark:border-gray-700 px-4 md:px-6 py-6">
                <h1 className="text-gray-900 dark:text-white text-lg font-semibold mb-6 text-center md:text-left">
                    Edit Profile
                </h1>

                <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-50 dark:bg-blue-500/20 border border-blue-100 dark:border-blue-400/40 flex items-center justify-center">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt="profile picture"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <ImagePlus className="w-8 h-8 text-blue-400 dark:text-blue-300" />
                        )}
                    </div>
                    <label className="text-sm text-blue-500 dark:text-blue-400 font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-300">
                        Change Pic
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </label>
                </div>

                <div className="max-w-md mx-auto md:mx-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 px-4 shadow-sm dark:shadow-black/40">
                    <ProfileRow
                        label={fieldMeta.displayName.label}
                        value={profile.displayName}
                        placeholder={getPlaceholder("displayName")}
                        onClick={() => setEditing("displayName")}
                    />
                    <ProfileRow
                        label={fieldMeta.bio.label}
                        value={profile.bio}
                        placeholder={getPlaceholder("bio")}
                        onClick={() => setEditing("bio")}
                    />

                    <div className="mt-2">
                        <p className="text-xs font-medium text-blue-500 dark:text-blue-400 pt-2 pb-1">Link 1</p>
                        <ProfileRow
                            label={fieldMeta.nameLink1.label}
                            value={profile.nameLink1}
                            placeholder={getPlaceholder("nameLink1")}
                            onClick={() => setEditing("nameLink1")}
                        />
                        <ProfileRow
                            label={fieldMeta.link1.label}
                            value={profile.link1}
                            placeholder={getPlaceholder("link1")}
                            onClick={() => setEditing("link1")}
                        />
                    </div>

                    <div className="mt-2">
                        <p className="text-xs font-medium text-blue-500 dark:text-blue-400 pt-2 pb-1">Link 2</p>
                        <ProfileRow
                            label={fieldMeta.nameLink2.label}
                            value={profile.nameLink2}
                            placeholder={getPlaceholder("nameLink2")}
                            onClick={() => setEditing("nameLink2")}
                        />
                        <ProfileRow
                            label={fieldMeta.link2.label}
                            value={profile.link2}
                            placeholder={getPlaceholder("link2")}
                            onClick={() => setEditing("link2")}
                        />
                    </div>

                    <div className="mt-2">
                        <p className="text-xs font-medium text-blue-500 dark:text-blue-400 pt-2 pb-1">Link 3</p>
                        <ProfileRow
                            label={fieldMeta.nameLink3.label}
                            value={profile.nameLink3}
                            placeholder={getPlaceholder("nameLink3")}
                            onClick={() => setEditing("nameLink3")}
                        />
                        <div className="[&>button]:border-b-0">
                            <ProfileRow
                                label={fieldMeta.link3.label}
                                value={profile.link3}
                                placeholder={getPlaceholder("link3")}
                                onClick={() => setEditing("link3")}
                            />
                        </div>
                    </div>
                </div>

                <div className="max-w-md mx-auto md:mx-0 mt-4">
                    <button
                        type="button"
                        onClick={handleEditProfile}
                        disabled={submitting}
                        className="w-full rounded-xl py-2.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? "Saving..." : "Save Profile"}
                    </button>
                </div>

                <EditFieldModal
                    key={editing}
                    open={editing !== null}
                    label={editing ? fieldMeta[editing].label : ""}
                    value={editing ? profile[editing] : ""}
                    placeholder={editing ? getPlaceholder(editing) : ""}
                    multiline={editing ? fieldMeta[editing].multiline : false}
                    onSave={(val) => handleSave(editing, val)}
                    onClose={() => setEditing(null)}
                />
            </div>

            <ConnectWallet />
        </div>
    );
};

export default EditProfile;