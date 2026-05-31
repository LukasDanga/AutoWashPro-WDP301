import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';

export default function LoginRegisterScreen(){
  const [tab, setTab] = useState('login');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');

  const [name, setName] = useState('');
  const [rphone, setRPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rpass, setRPass] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={{alignItems:'center'}}>
          <Text style={styles.logo}>💧</Text>
          <Text style={styles.title}>AUTOWASH APP</Text>
          <Text style={styles.tag}>Tích điểm rửa xe cao cấp bọt khí sạch</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab==='login' && styles.tabActive]} onPress={()=>setTab('login')}><Text style={tab==='login'?styles.tabTextActive:styles.tabText}>ĐĂNG NHẬP</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab==='register' && styles.tabActive]} onPress={()=>setTab('register')}><Text style={tab==='register'?styles.tabTextActive:styles.tabText}>ĐĂNG KÝ</Text></TouchableOpacity>
        </View>

        {tab==='login' && (
          <View>
            <Text style={styles.label}>Số điện thoại khách hàng</Text>
            <View style={styles.input}><TextInput style={styles.inputInner} placeholder="0901234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/></View>

            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.input}><TextInput style={styles.inputInner} placeholder="Nhập 8+ ký tự" value={pass} onChangeText={setPass} secureTextEntry/></View>

            <TouchableOpacity style={styles.primary} onPress={()=>Alert.alert('Đăng nhập demo',phone)}><Text style={styles.primaryText}>ĐĂNG NHẬP →</Text></TouchableOpacity>
          </View>
        )}

        {tab==='register' && (
          <View>
            <Text style={styles.label}>Tên thành viên</Text>
            <View style={styles.input}><TextInput style={styles.inputInner} placeholder="Tên của bạn" value={name} onChangeText={setName}/></View>

            <Text style={styles.label}>Số điện thoại</Text>
            <View style={styles.input}><TextInput style={styles.inputInner} placeholder="0901234567" value={rphone} onChangeText={setRPhone} keyboardType="phone-pad"/></View>

            <Text style={styles.label}>Email</Text>
            <View style={styles.input}><TextInput style={styles.inputInner} placeholder="khachhang@mail.com" value={email} onChangeText={setEmail} keyboardType="email-address"/></View>

            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.input}><TextInput style={styles.inputInner} placeholder="Nhập 8+ ký tự" value={rpass} onChangeText={setRPass} secureTextEntry/></View>

            <TouchableOpacity style={styles.primary} onPress={()=>Alert.alert('Đăng ký demo',name)}><Text style={styles.primaryText}>KÍCH HOẠT TÀI KHOẢN →</Text></TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
  );
}
