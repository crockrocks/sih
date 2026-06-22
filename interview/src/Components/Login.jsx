import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function LoginForm({ onAlternateLoginSuccess, darkMode }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reEnterPassword, setReEnterPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();  

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setName('');
    setEmail('');
    setPassword('');
    setReEnterPassword('');
    setIsEmployee(false);
    setEmployeeId('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
  
    if (isLogin) {
      // Login flow
      const testUser = { email: 'test@example.com', password: 'test' };
      const altUser = { email: 'client@example.com', password: 'client' };
  
      if (email === testUser.email && password === testUser.password) {
        navigate('/dashboard/testuser');
        return;
      } else if (email === altUser.email && password === altUser.password) {
        onAlternateLoginSuccess();
        navigate('/dashboard/client');
        return;
      }
  
      try {
        const response = await api.post('/api/login', { email, password });
        if (response.data.success) {
          if (response.data.resumeData) {
            localStorage.setItem('userResumeData', JSON.stringify(response.data.resumeData));
          }
          localStorage.setItem('userEmail', email);
          navigate(`/dashboard/${response.data.userId}`);
        } else {
          setMessage(response.data.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        setMessage(error.response?.data?.message || 'Login failed. Please try again.');
      }
    } else {
      // Signup flow
      if (password !== reEnterPassword) {
        setMessage("Passwords do not match.");
        return;
      }
  
      try {
        const response = await api.post('/api/register', {
          name,
          email,
          password,
          isEmployee,
          employeeId: isEmployee ? employeeId : undefined
        });
  
        if (response.data.success) {
          setMessage(response.data.message);
          if (response.data.is_employee) {
            setMessage(prevMessage => `${prevMessage} Employee code: ${response.data.employee_code}`);
          }
          localStorage.setItem('userEmail', email);
          navigate('/interview');
        } else {
          setMessage(response.data.message || 'Sign-up failed');
        }
      } catch (error) {
        console.error('Sign-up error:', error);
        setMessage(error.response?.data?.message || 'Sign-up failed. Please try again.');
      }
    }
  };


  return (
    <section className={`${darkMode ? 'bg-dark-background' : 'bg-light-background'} min-h-screen`}>
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto min-h-screen lg:py-0">
        <a href="#" className={`flex items-center mb-6 text-2xl font-semibold ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>
          InterviewAssist
        </a>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'} w-full rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0`}>
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className={`${darkMode ? 'text-dark-text' : 'text-light-text'} text-xl font-bold leading-tight tracking-tight md:text-2xl`}>
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </h1>
            {message && (
              <div className={`p-4 mb-4 text-sm rounded-lg ${darkMode ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'}`} role="alert">
                {message}
              </div>
            )}
            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="name" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Your name</label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className={`${darkMode ? 'bg-gray-700 border-gray-600 text-dark-text' : 'bg-gray-200 border-gray-400 text-light-text'} sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                      placeholder="John Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      id="is-employee"
                      type="checkbox"
                      className="w-4 h-4 border border-gray-600 rounded bg-gray-700 focus:ring-3 focus:ring-blue-600"
                      checked={isEmployee}
                      onChange={(e) => setIsEmployee(e.target.checked)}
                    />
                    <label htmlFor="is-employee" className={`ml-2 text-sm ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Are you an employee?</label>
                  </div>
                  {isEmployee && (
                    <div>
                      <label htmlFor="employee-id" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Employee ID</label>
                      <input
                        type="text"
                        name="employee-id"
                        id="employee-id"
                        className={`${darkMode ? 'bg-gray-700 border-gray-600 text-dark-text' : 'bg-gray-200 border-gray-400 text-light-text'} sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                        placeholder="Enter your employee ID"
                        required={isEmployee}
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
              <div>
                <label htmlFor="email" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Your email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className={`${darkMode ? 'bg-gray-700 border-gray-600 text-dark-text' : 'bg-gray-200 border-gray-400 text-light-text'} sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Password</label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  className={`${darkMode ? 'bg-gray-700 border-gray-600 text-dark-text' : 'bg-gray-200 border-gray-400 text-light-text'} sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!isLogin && (
                <div>
                  <label htmlFor="confirm-password" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Confirm password</label>
                  <input
                    type="password"
                    name="confirm-password"
                    id="confirm-password"
                    placeholder="••••••••"
                    className={`${darkMode ? 'bg-gray-700 border-gray-600 text-dark-text' : 'bg-gray-200 border-gray-400 text-light-text'} sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                    required
                    value={reEnterPassword}
                    onChange={(e) => setReEnterPassword(e.target.value)}
                  />
                </div>
              )}
              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="remember"
                        aria-describedby="remember"
                        type="checkbox"
                        className="w-4 h-4 border border-gray-600 rounded bg-gray-700 focus:ring-3 focus:ring-blue-600"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="remember" className={`${darkMode ? 'text-dark-text' : 'text-light-text'}`}>Remember me</label>
                    </div>
                  </div>
                  <a href="#" className="text-sm font-medium text-blue-500 hover:underline">Forgot password?</a>
                </div>
              )}
              <button
                type="submit"
                className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              >
                {isLogin ? 'Sign in' : 'Sign up'}
              </button>
              <p className={`text-sm font-light ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isLogin ? "Don't have an account yet?" : 'Already have an account?'}{' '}
                <button type="button" onClick={toggleForm} className="font-medium text-blue-500 hover:underline">
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginForm;