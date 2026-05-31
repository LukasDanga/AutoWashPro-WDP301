import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container:{flexGrow:1,backgroundColor:'#071025',alignItems:'center',padding:20},
  card:{width:'100%',backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,padding:16},
  logo:{fontSize:40,backgroundColor:'rgba(255,255,255,0.04)',padding:10,borderRadius:10},
  title:{color:'#eaf1ff',fontSize:18,fontWeight:'700',marginTop:8,textAlign:'center'},
  tag:{color:'rgba(255,255,255,0.5)',textAlign:'center',marginBottom:10},
  tabs:{flexDirection:'row',marginVertical:10},
  tab:{flex:1,padding:8,borderRadius:8,backgroundColor:'transparent',borderWidth:1,borderColor:'rgba(255,255,255,0.06)',alignItems:'center'},
  tabActive:{backgroundColor:'#1772ff'},
  tabText:{color:'rgba(255,255,255,0.7)'},
  tabTextActive:{color:'#021027',fontWeight:'700'},
  label:{color:'rgba(255,255,255,0.6)',marginTop:8,marginBottom:4},
  input:{backgroundColor:'rgba(255,255,255,0.02)',borderRadius:8,padding:8,borderWidth:1,borderColor:'rgba(255,255,255,0.03)'},
  inputInner:{color:'#fff'},
  primary:{marginTop:12,backgroundColor:'#1772ff',padding:12,borderRadius:10,alignItems:'center'},
  primaryText:{color:'#021027',fontWeight:'700'}
});
