// auth.js - ユーザー認証とアカウント管理のためのモジュール

// ユーザー認証関連の機能
const authModule = {
    // ログインユーザー情報
    currentUser: null,
    
    // ログイン処理
    login(email, password) {
        // 実際の実装ではサーバーAPIを呼び出します
        return new Promise((resolve, reject) => {
            // ダミーのユーザーデータ (実際はサーバーから取得)
            const users = [
                { id: 1, name: '田中太郎', email: 'tanaka@example.com', password: 'password123', type: 'provider' },
                { id: 2, name: '山田花子', email: 'yamada@example.com', password: 'pass456', type: 'user' },
                { id: 3, name: '佐藤一郎', email: 'sato@example.com', password: 'sato789', type: 'both' }
            ];
            
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                // パスワードを除外したユーザー情報をセット
                const { password, ...userData } = user;
                this.currentUser = userData;
                
                // ローカルストレージに保存
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('authToken', this.generateToken(userData));
                
                resolve(userData);
            } else {
                reject(new Error('メールアドレスまたはパスワードが正しくありません'));
            }
        });
    },
    
    // ログアウト処理
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
    },
    
    // ログイン状態チェック
    checkLoginStatus() {
        const userStr = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');
        
        if (userStr && token) {
            try {
                this.currentUser = JSON.parse(userStr);
                return true;
            } catch (e) {
                this.logout();
                return false;
            }
        }
        return false;
    },
    
    // 簡易的なトークン生成（実際の実装ではより堅牢な方法を使用）
    generateToken(user) {
        return btoa(`${user.id}:${user.email}:${Date.now()}`);
    },
    
    // 新規ユーザー登録
    register(userData) {
        // 実際の実装ではサーバーAPIを呼び出します
        return new Promise((resolve, reject) => {
            // メールアドレスの重複チェック（実際はサーバーサイドで行う）
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            
            if (existingUsers.some(u => u.email === userData.email)) {
                reject(new Error('このメールアドレスは既に登録されています'));
                return;
            }
            
            // 新規ユーザー作成
            const newUser = {
                ...userData,
                id: Date.now() // 仮のID生成
            };
            
            // パスワードはハッシュ化するべきだが、クライアントサイドのデモなので省略
            
            // 登録ユーザーリストに追加（実際はデータベースに保存）
            existingUsers.push(newUser);
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
            
            // ログイン情報として保存
            const { password, ...userDataWithoutPassword } = newUser;
            this.currentUser = userDataWithoutPassword;
            localStorage.setItem('currentUser', JSON.stringify(userDataWithoutPassword));
            localStorage.setItem('authToken', this.generateToken(userDataWithoutPassword));
            
            resolve(userDataWithoutPassword);
        });
    },
    
    // ユーザー情報の更新
    updateUserProfile(userData) {
        return new Promise((resolve, reject) => {
            if (!this.currentUser) {
                reject(new Error('ログインしていません'));
                return;
            }
            
            // 現在のユーザー情報とマージ
            const updatedUser = { ...this.currentUser, ...userData };
            this.currentUser = updatedUser;
            
            // ローカルストレージを更新
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            // 登録ユーザーリストも更新（実際はデータベース）
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const updatedUsers = existingUsers.map(user => 
                user.id === updatedUser.id ? { ...user, ...userData } : user
            );
            localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
            
            resolve(updatedUser);
        });
    }
};

// ページ読み込み時の初期化処理
document.addEventListener('DOMContentLoaded', () => {
    // ログイン状態をチェック
    if (authModule.checkLoginStatus()) {
        updateUIForLoggedInUser(authModule.currentUser);
    } else {
        updateUIForLoggedOutUser();
    }
    
    // ログインフォームのイベントリスナー
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const user = await authModule.login(email, password);
            updateUIForLoggedInUser(user);
            closeModal('login-modal');
            showNotification('ログインしました');
        } catch (error) {
            showFormError('login-form', error.message);
        }
    });
    
    // 新規登録フォームのイベントリスナー
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const userType = document.getElementById('user-type').value;
        
        // バリデーション
        if (password !== confirmPassword) {
            showFormError('register-form', 'パスワードが一致しません');
            return;
        }
        
        if (password.length < 6) {
            showFormError('register-form', 'パスワードは6文字以上で設定してください');
            return;
        }
        
        try {
            const user = await authModule.register({
                name,
                email,
                password,
                type: userType
            });
            
            updateUIForLoggedInUser(user);
            closeModal('register-modal');
            showNotification('アカウント登録が完了しました。ようこそ！');
        } catch (error) {
            showFormError('register-form', error.message);
        }
    });
    
    // ログアウトボタンの設定
    setupLogoutButton();
    
    // タブ内のアカウント管理セクションを追加
    addAccountSettingsSection();
});

// ログイン状態に合わせてUIを更新する関数
function updateUIForLoggedInUser(user) {
    // ログインボタンをログアウトボタンに変更
    const loginBtn = document.getElementById('login-btn');
    loginBtn.textContent = 'ログアウト';
    loginBtn.setAttribute('id', 'logout-btn');
    
    // ユーザー名を表示するエレメントを追加
    if (!document.getElementById('user-display')) {
        const userDisplayEl = document.createElement('div');
        userDisplayEl.id = 'user-display';
        userDisplayEl.className = 'user-display';
        userDisplayEl.textContent = `${user.name}さん`;
        
        const nav = document.querySelector('header nav');
        nav.insertBefore(userDisplayEl, loginBtn);
    } else {
        document.getElementById('user-display').textContent = `${user.name}さん`;
    }
    
    // ユーザータイプに応じてタブの表示/非表示
    if (user.type === 'provider' || user.type === 'both') {
        document.querySelector('.tab[data-tab="provider"]').style.display = 'block';
        document.querySelector('a[data-tab="provider"]').style.display = 'block';
    } else {
        document.querySelector('.tab[data-tab="provider"]').style.display = 'none';
        document.querySelector('a[data-tab="provider"]').style.display = 'none';
    }
    
    if (user.type === 'user' || user.type === 'both') {
        document.querySelector('.tab[data-tab="user"]').style.display = 'block';
        document.querySelector('a[data-tab="user"]').style.display = 'block';
    } else {
        document.querySelector('.tab[data-tab="user"]').style.display = 'none';
        document.querySelector('a[data-tab="user"]').style.display = 'none';
    }
    
    // マイページをアクティブに
    document.querySelector('.tab[data-tab="dashboard"]').click();
    
    // マイページのユーザー情報を更新
    updateDashboardWithUserData(user);
    
    // ログアウトボタンのイベントリスナーを設定
    setupLogoutButton();
}

function updateUIForLoggedOutUser() {
    // ログアウトボタンをログインボタンに戻す
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.textContent = 'ログイン';
        logoutBtn.setAttribute('id', 'login-btn');
    }
    
    // ユーザー名表示を削除
    const userDisplayEl = document.getElementById('user-display');
    if (userDisplayEl) {
        userDisplayEl.remove();
    }
    
    // すべてのタブを表示
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
        tab.style.display = 'block';
    });
    document.querySelectorAll('a[data-tab]').forEach(link => {
        link.style.display = 'block';
    });
    
    // ホームタブをアクティブに
    document.querySelector('.tab[data-tab="user"]').click();
    
    // ログインボタンのイベントリスナーを設定
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.removeEventListener('click', handleLogout);
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('login-modal');
        });
    }
}

// マイページのユーザー情報を更新
function updateDashboardWithUserData(user) {
    // アカウント設定セクションのフォームに値を設定
    const accountSettingsSection = document.getElementById('account-settings-section');
    if (accountSettingsSection) {
        const nameField = accountSettingsSection.querySelector('#profile-name');
        const emailField = accountSettingsSection.querySelector('#profile-email');
        const userTypeField = accountSettingsSection.querySelector('#profile-type');
        
        if (nameField) nameField.value = user.name || '';
        if (emailField) emailField.value = user.email || '';
        if (userTypeField) {
            const options = userTypeField.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === user.type) {
                    userTypeField.selectedIndex = i;
                    break;
                }
            }
        }
    }
    
    // ユーザータイプによって表示するコンテンツを切り替え
    if (user.type === 'provider' || user.type === 'both') {
        // 配車提供者向けのコンテンツを表示
        document.getElementById('my-providers-tab').style.display = 'block';
        document.getElementById('booking-requests-tab').style.display = 'block';
        document.querySelector('.tab[data-subtab="my-providers"]').style.display = 'block';
        document.querySelector('.tab[data-subtab="booking-requests"]').style.display = 'block';
    } else {
        // 配車提供者向けのコンテンツを非表示
        document.getElementById('my-providers-tab').style.display = 'none';
        document.getElementById('booking-requests-tab').style.display = 'none';
        document.querySelector('.tab[data-subtab="my-providers"]').style.display = 'none';
        document.querySelector('.tab[data-subtab="booking-requests"]').style.display = 'none';
    }
    
    if (user.type === 'user' || user.type === 'both') {
        // 利用者向けのコンテンツを表示
        document.getElementById('my-bookings-tab').style.display = 'block';
        document.querySelector('.tab[data-subtab="my-bookings"]').style.display = 'block';
    } else {
        // 利用者向けのコンテンツを非表示
        document.getElementById('my-bookings-tab').style.display = 'none';
        document.querySelector('.tab[data-subtab="my-bookings"]').style.display = 'none';
    }
}

// ログアウトボタンのイベントリスナーを設定
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ログアウト処理
function handleLogout(e) {
    e.preventDefault();
    authModule.logout();
    updateUIForLoggedOutUser();
    showNotification('ログアウトしました');
}

// フォームエラーを表示する関数
function showFormError(formId, message) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // 既存のエラーメッセージを削除
    const existingError = form.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // 新しいエラーメッセージを作成
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    
    // フォームの先頭に挿入
    form.insertBefore(errorElement, form.firstChild);
}

// 通知を表示する関数
function showNotification(message) {
    document.getElementById('success-message').textContent = message;
    showModal('success-modal');
}

// アカウント設定セクションを追加
function addAccountSettingsSection() {
    // マイページのタブコンテンツ内にアカウント設定タブを追加
    const dashboardTab = document.getElementById('dashboard-tab');
    const tabsDiv = dashboardTab.querySelector('.tabs');
    
    // アカウント設定タブボタンを追加
    const accountSettingsTabButton = document.createElement('div');
    accountSettingsTabButton.className = 'tab';
    accountSettingsTabButton.setAttribute('data-subtab', 'account-settings');
    accountSettingsTabButton.textContent = 'アカウント設定';
    tabsDiv.appendChild(accountSettingsTabButton);
    
    // アカウント設定タブコンテンツを追加
    const accountSettingsTab = document.createElement('div');
    accountSettingsTab.id = 'account-settings-tab';
    accountSettingsTab.className = 'tab-content';
    accountSettingsTab.innerHTML = `
        <h3>アカウント設定</h3>
        <div id="account-settings-section" class="account-settings">
            <div class="profile-image">
                <img src="/api/placeholder/100/100" alt="プロフィール画像">
            </div>
            <form id="profile-form">
                <div class="form-group">
                    <label for="profile-name">氏名</label>
                    <input type="text" id="profile-name" required>
                </div>
                <div class="form-group">
                    <label for="profile-email">メールアドレス</label>
                    <input type="email" id="profile-email" required>
                </div>
                <div class="form-group">
                    <label for="profile-type">ユーザータイプ</label>
                    <select id="profile-type" required>
                        <option value="">選択してください</option>
                        <option value="provider">配車提供者</option>
                        <option value="user">利用者</option>
                        <option value="both">両方</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="profile-current-password">現在のパスワード</label>
                    <input type="password" id="profile-current-password">
                    <small>パスワードを変更する場合のみ入力</small>
                </div>
                <div class="form-group">
                    <label for="profile-new-password">新しいパスワード</label>
                    <input type="password" id="profile-new-password">
                </div>
                <div class="form-group">
                    <label for="profile-confirm-password">新しいパスワード（確認）</label>
                    <input type="password" id="profile-confirm-password">
                </div>
                <button type="submit" class="btn">変更を保存</button>
            </form>
        </div>
    `;
    dashboardTab.appendChild(accountSettingsTab);
    
    // プロフィール更新フォームにイベントリスナーを追加
    accountSettingsTab.querySelector('#profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('profile-name').value;
        const email = document.getElementById('profile-email').value;
        const userType = document.getElementById('profile-type').value;
        const currentPassword = document.getElementById('profile-current-password').value;
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;
        
        // パスワード変更のバリデーション
        if (newPassword) {
            if (!currentPassword) {
                showFormError('profile-form', '現在のパスワードを入力してください');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showFormError('profile-form', '新しいパスワードが一致しません');
                return;
            }
            
            if (newPassword.length < 6) {
                showFormError('profile-form', 'パスワードは6文字以上で設定してください');
                return;
            }
            
            // 現在のパスワードが正しいか確認（実際はサーバーサイドで行う）
            // ここではダミーチェック
        }
        
        // ユーザー情報の更新
        try {
            const updatedData = {
                name,
                email,
                type: userType
            };
            
            if (newPassword) {
                updatedData.password = newPassword;
            }
            
            const updatedUser = await authModule.updateUserProfile(updatedData);
            
            // UI更新
            updateUIForLoggedInUser(updatedUser);
            showNotification('アカウント情報を更新しました');
            
            // パスワードフィールドをクリア
            document.getElementById('profile-current-password').value = '';
            document.getElementById('profile-new-password').value = '';
            document.getElementById('profile-confirm-password').value = '';
        } catch (error) {
            showFormError('profile-form', error.message);
        }
    });
    
    // アカウント設定タブのクリックイベントを追加
    accountSettingsTabButton.addEventListener('click', () => {
        // すべてのサブタブを非アクティブに
        dashboardTab.querySelectorAll('.tab[data-subtab]').forEach(t => {
            t.classList.remove('active');
        });
        accountSettingsTabButton.classList.add('active');
        
        // すべてのタブコンテンツを非表示に
        dashboardTab.querySelectorAll('.tab-content').forEach(content => {
            if (content.id !== 'dashboard-tab') {
                content.classList.remove('active');
            }
        });
        accountSettingsTab.classList.add('active');
    });
}

// CSSスタイルを追加
function addCustomStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* ユーザーアカウント関連のスタイル */
        .user-display {
            background-color: var(--secondary-color);
            color: var(--light-text);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            margin-right: 1rem;
            font-weight: 500;
        }

        /* フォームエラー表示用 */
        .form-error {
            color: var(--accent-color);
            font-size: 0.9rem;
            margin-top: 0.3rem;
            margin-bottom: 1rem;
        }

        /* アカウント設定タブ */
        .account-settings {
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 2rem;
        }

        .profile-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background-color: var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            overflow: hidden;
        }

        .profile-image img {
            width: 100%;
            height: auto;
        }
        
        /* フォームグループ内の小さいテキスト */
        .form-group small {
            display: block;
            color: #666;
            margin-top: 0.3rem;
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(styleElement);
}

// スタイルを追加
addCustomStyles();