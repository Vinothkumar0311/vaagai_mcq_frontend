import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import useAuth from "../hooks/useAuth";
import { loadUserFromStorage } from "../store/authSlice";
import { authApi } from "../services/api";
import { Shield, BookOpen, Key, AlertCircle, UserCheck, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export const Login = ({ isAdminRoute }) => {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const isAdmin = isAdminRoute !== undefined ? isAdminRoute : location.pathname.includes('/admin');

  const [emailInput, setEmailInput] = useState(isAdmin ? "admin@vaagai.com" : "");
  const [nameInput, setNameInput] = useState(isAdmin ? "Vaagai Admin" : "");
  const [regNoInput, setRegNoInput] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [completeName, setCompleteName] = useState("");
  const [completeSchool, setCompleteSchool] = useState("");
  const [completeClass, setCompleteClass] = useState("1");
  const [completeMobile, setCompleteMobile] = useState("");
  const [completePlace, setCompletePlace] = useState("");

  // Handle redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/examiner");
      }
    }
  }, [user, navigate]);

  const handleMockAdminLogin = async (e) => {
    e.preventDefault();
    if (!emailInput) {
      toast.error("Please enter an email.");
      return;
    }

    try {
      const result = await login({
        email: emailInput.trim(),
        name: nameInput.trim() || "Vaagai Admin",
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nameInput)}`,
      });
      navigate("/admin");
    } catch (err) {
      console.error(err);
    }
  };

  const handleExaminerLoginSubmit = async (e) => {
    e.preventDefault();
    if (!regNoInput) {
      toast.error("Please enter your Registration Number.");
      return;
    }

    try {
      setLoginLoading(true);
      const data = await authApi.loginWithRegNo(regNoInput.trim());
      if (data.needsCompleteProfile) {
        setProfileData(data);
        setCompleteName(data.registration.name || "");
        setCompleteSchool(data.registration.schoolName || "");
        setCompleteClass(data.registration.class || "1");
        setCompleteMobile(data.registration.mobileNumber || "");
        setCompletePlace(data.registration.place || "");
        toast.success("Please fill in your missing registration details.");
      } else {
        setProfileData(data);
        toast.success("Registration details retrieved successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Authentication failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCompleteProfileSubmit = async (e) => {
    e.preventDefault();
    if (!completeName.trim()) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!completeSchool.trim()) {
      toast.error("Please enter your School Name.");
      return;
    }
    if (!completeClass) {
      toast.error("Please select your class.");
      return;
    }
    if (!completeMobile.trim()) {
      toast.error("Please enter your Mobile Number.");
      return;
    }

    try {
      setLoginLoading(true);
      const data = await authApi.loginWithRegNo(regNoInput.trim(), {
        name: completeName.trim(),
        class: completeClass,
        schoolName: completeSchool.trim(),
        mobileNumber: completeMobile.trim(),
        place: completePlace.trim()
      });

      if (data.needsCompleteProfile) {
        toast.error("Failed to complete profile. Verify all required fields.");
      } else {
        localStorage.setItem('mcq_token', data.token);
        localStorage.setItem('mcq_user', JSON.stringify(data.user));
        dispatch(loadUserFromStorage());
        toast.success("Details updated! Redirecting to dashboard...");
        navigate("/examiner");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Failed to update profile");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-darkBg flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background blobs for premium gradient effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/5 dark:bg-primary-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-700/5 dark:bg-accent-700/10 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Portal Branding */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-primary-600/30 mb-4 animate-float">
          V
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-outfit">
          {isAdmin ? "Vaagai Admin Portal" : "Vaagai Examiner Portal"}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? "Secure Administrator Authentication" : "Secure Examiner Login & Performance Platform"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/80 dark:bg-darkCard/75 backdrop-blur-xl py-8 px-4 border border-slate-205/60 dark:border-white/5 rounded-3xl shadow-xl sm:px-10 transition-colors duration-300">
          
          {isAdmin ? (
            /* Admin Credentials Form */
            <form onSubmit={handleMockAdminLogin} className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs mb-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>
                  <strong>Admin Sandbox Mode:</strong> Log in using admin credentials below.
                </span>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Admin Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="admin@vaagai.com"
                />
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Admin Username / Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="Vaagai Admin"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all disabled:opacity-50"
              >
                <Key size={16} />
                {loading ? "Authenticating..." : "Launch Admin Portal"}
              </button>
            </form>
          ) : profileData && profileData.needsCompleteProfile ? (
            /* Complete Missing Profile Details Form */
            <form onSubmit={handleCompleteProfileSubmit} className="space-y-4 text-left animate-fade-in">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mb-3 border border-amber-200 dark:border-amber-900/40">
                  <UserCheck size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Complete Your Profile</h3>
                <p className="text-xs text-slate-400 mt-1">Please provide missing details before proceeding.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={completeName}
                  onChange={(e) => setCompleteName(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="e.g. Vinothkumar S"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Class / Grade <span className="text-rose-500">*</span>
                </label>
                <select
                  value={completeClass}
                  onChange={(e) => setCompleteClass(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100 font-bold"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  School Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={completeSchool}
                  onChange={(e) => setCompleteSchool(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="e.g. Vaagai Matric School"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={completeMobile}
                  onChange={(e) => setCompleteMobile(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Place (Optional)
                </label>
                <input
                  type="text"
                  value={completePlace}
                  onChange={(e) => setCompletePlace(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="e.g. Chennai"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileData(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold active:scale-98 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Proceed</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : profileData ? (
            /* Examiner Profile Confirmation Card */
            <div className="space-y-6 text-center animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-950/30 text-primary-600 flex items-center justify-center mb-4 border border-primary-200 dark:border-primary-900/40">
                <UserCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Verified</h3>
                <p className="text-xs text-slate-400 mt-1">Please confirm your registration details to proceed.</p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-450 dark:text-slate-500">Name</span>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{profileData.user.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-450 dark:text-slate-500">Class</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{profileData.user.class || 'Universal'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-450 dark:text-slate-500">Reg No</span>
                    <p className="font-bold text-slate-855 dark:text-slate-100">{profileData.user.regNo}</p>
                  </div>
                </div>
                {profileData.user.schoolName && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-450 dark:text-slate-500">School Name</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-relaxed">{profileData.user.schoolName}</p>
                  </div>
                )}
                {profileData.user.mobileNumber && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-450 dark:text-slate-500">Mobile Number</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{profileData.user.mobileNumber}</p>
                  </div>
                )}
                {profileData.user.place && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-450 dark:text-slate-500">Place</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{profileData.user.place}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setProfileData(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold active:scale-98 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('mcq_token', profileData.token);
                    localStorage.setItem('mcq_user', JSON.stringify(profileData.user));
                    dispatch(loadUserFromStorage());
                    navigate("/examiner");
                  }}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all"
                >
                  <span>Proceed to Dashboard</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Examiner Registration Number Login Form */
            <form onSubmit={handleExaminerLoginSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="regNo"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Enter Registration Number (Ref No)
                </label>
                <input
                  id="regNo"
                  type="text"
                  required
                  value={regNoInput}
                  onChange={(e) => setRegNoInput(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/45 dark:focus:ring-primary-600/30 text-slate-800 dark:text-slate-100"
                  placeholder="e.g. REF001, EXM-123"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying details...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Registration</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 flex justify-center text-xs text-slate-400">
            Powered by Vaagai Tamil Sangam Core
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
