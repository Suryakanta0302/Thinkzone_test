import { Avatar, Button, Paper, Stack, Typography } from '@mui/material';

const users = [
  { userId: 'U1001', userName: 'Asha Patra', role: 'Cluster coordinator' },
  { userId: 'U1002', userName: 'Ramesh Nayak', role: 'Cluster coordinator' },
  { userId: 'U1003', userName: 'Sunita Das', role: 'Block officer' },
];

export default function UserPicker({ onChoose }) {
  return (
    <section className="user-screen">
      <div className="user-intro">
        <span className="eyebrow">FIELD OPERATIONS / SCHOOL VISITS</span>
        <Typography variant="h1">Who is on the field today?</Typography>
        <Typography color="text.secondary">Choose your profile to start recording visits.</Typography>
      </div>
      <Stack className="user-list" spacing={1.5}>
        {users.map((user, index) => (
          <Paper className="user-row" key={user.userId} variant="outlined">
            <Avatar className={`user-avatar avatar-${index}`}>{user.userName.split(' ').map((part) => part[0]).join('')}</Avatar>
            <div className="user-copy">
              <Typography variant="h3">{user.userName}</Typography>
              <Typography color="text.secondary" variant="body2">{user.role}</Typography>
            </div>
            <Button variant="outlined" onClick={() => onChoose(user)}>Select</Button>
          </Paper>
        ))}
      </Stack>
    </section>
  );
}