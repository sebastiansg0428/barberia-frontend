// Servicio de autenticación usando localStorage y API del navegador

const USERS_KEY = 'barberia_users';
const CURRENT_USER_KEY = 'barberia_current_user';

/**
 * Obtener todos los usuarios registrados
 */
export const getAllUsers = () => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

/**
 * Registrar un nuevo usuario
 */
export const registerUser = (email, password, fullName) => {
  const users = getAllUsers();

  // Verificar si el email ya existe
  if (users.some(user => user.email === email)) {
    throw new Error('El email ya está registrado');
  }

  // Crear nuevo usuario
  const newUser = {
    id: Date.now().toString(),
    email,
    password, // En producción: hashear la contraseña
    fullName,
    createdAt: new Date().toISOString(),
    isAdmin: email === 'bardemo@beria.com' ? true : users.length === 0 // Demo siempre admin
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  return { id: newUser.id, email: newUser.email, fullName: newUser.fullName };
};

/**
 * Iniciar sesión
 */
export const login = (email, password) => {
  const users = getAllUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    throw new Error('Email o contraseña incorrectos');
  }

  // Guardar usuario actual (sin la contraseña)
  const { password: _, ...userWithoutPassword } = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

  return userWithoutPassword;
};

/**
 * Obtener usuario actual
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Cerrar sesión
 */
export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

/**
 * Actualizar datos de un usuario
 */
export const updateUser = (userId, updatedData) => {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    throw new Error('Usuario no encontrado');
  }

  users[userIndex] = { ...users[userIndex], ...updatedData };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Si es el usuario actual, actualizar también el currentUser
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    const { password: _, ...userWithoutPassword } = users[userIndex];
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
  }

  return users[userIndex];
};

/**
 * Eliminar un usuario
 */
export const deleteUser = (userId) => {
  const users = getAllUsers();
  const filteredUsers = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
};

/**
 * Verificar si el usuario está autenticado
 */
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};
