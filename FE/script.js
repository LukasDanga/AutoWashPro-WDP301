document.addEventListener('DOMContentLoaded',()=>{
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const target = t.dataset.target;
    document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
    document.getElementById(target).classList.remove('hidden');
  }));

  document.getElementById('quick-fill').addEventListener('click',()=>{
    document.getElementById('login-phone').value='0901234567';
    document.getElementById('login-pass').value='password123';
    alert('Đã điền thử nghiệm (phone + mật khẩu).');
  });

  document.querySelectorAll('.eye').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const target = document.querySelector(btn.dataset.target);
      if(!target) return;
      target.type = target.type === 'password' ? 'text' : 'password';
    });
  });

  // placeholder actions for buttons
  document.getElementById('login-btn').addEventListener('click',()=>{
    alert('Gửi yêu cầu đăng nhập (demo).\nSĐT: '+document.getElementById('login-phone').value);
  });
  document.getElementById('activate-btn').addEventListener('click',()=>{
    alert('Gửi yêu cầu đăng ký (demo).\nTên: '+document.getElementById('reg-name').value);
  });
});
