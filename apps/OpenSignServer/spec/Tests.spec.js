import axios from 'axios';
describe('Parse Server example', () => {
  Parse.User.enableUnsafeCurrentUser();
  it('rejects an unknown cloud function', async () => {
    try {
      await Parse.Cloud.run('__lexysign_missing_function__');
      fail('should not have run an unknown cloud function.');
    } catch (error) {
      expect(error.code).toBe(141);
      expect(error.message).toContain('Invalid function');
    }
  });
  it('denies unauthenticated class creation', async () => {
    const obj = new Parse.Object('Test');
    try {
      await obj.save();
      fail('should not have been able to save test object.');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe(119);
      expect(error.message).toBe('Permission denied');
    }
  });
  it('serves the LexySign server health root', async () => {
    const { data, headers } = await axios.get('http://localhost:30001/');
    expect(headers['content-type']).toContain('text/html');
    expect(data).toBe('opensign-server is running !!!');
  });
});
