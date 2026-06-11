import { useSelector, useDispatch } from 'react-redux';
import { loginUser, loginExaminerWithRegNo, logout } from '../store/authSlice';
import { isRealFirebaseConfigured, auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  const login = async (mockCredentials = null) => {
    // If we're mocking, login via mock credentials
    const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';
    
    if (useMock || !isRealFirebaseConfigured || mockCredentials) {
      if (!mockCredentials) {
        toast.error('Mock login credentials are required in mock mode');
        return;
      }
      try {
        const resultAction = await dispatch(loginUser({ mockUser: mockCredentials }));
        if (loginUser.fulfilled.match(resultAction)) {
          toast.success(`Logged in as ${resultAction.payload.user.name}`);
          return resultAction.payload;
        } else {
          throw new Error(resultAction.payload || 'Login failed');
        }
      } catch (err) {
        toast.error(err.message);
        throw err;
      }
    }

    // Real Firebase auth flow
    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth client is not initialized.');
      }
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      
      const resultAction = await dispatch(loginUser({ token: idToken }));
      if (loginUser.fulfilled.match(resultAction)) {
        toast.success(`Logged in as ${resultAction.payload.user.name}`);
        return resultAction.payload;
      } else {
        throw new Error(resultAction.payload || 'Failed to authenticate on backend');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Google Authentication failed');
      throw err;
    }
  };

  const loginWithRegNo = async (regNo) => {
    try {
      const resultAction = await dispatch(loginExaminerWithRegNo(regNo));
      if (loginExaminerWithRegNo.fulfilled.match(resultAction)) {
        toast.success(`Logged in as ${resultAction.payload.user.name}`);
        return resultAction.payload;
      } else {
        throw new Error(resultAction.payload || 'Login failed');
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
      throw err;
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
  };

  return {
    user,
    token,
    loading,
    error,
    login,
    loginWithRegNo,
    logout: handleLogout,
    isAdmin: user?.role === 'ADMIN',
    isExaminer: user?.role === 'EXAMINER' || user?.role === 'ADMIN'
  };
};

export default useAuth;
