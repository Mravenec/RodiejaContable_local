import java.sql.*;

public class TestRoles {
    public static void main(String[] args) throws Exception {
        Connection conn = DriverManager.getConnection("jdbc:mariadb://localhost:3306/sistema_vehicular", "root", "123456");
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT r.nombre as rol, s.clave as submodulo, rp.can_view " +
                "FROM rol_permisos rp " +
                "JOIN roles r ON rp.rol_id = r.id " +
                "JOIN submodulos s ON rp.submodulo_id = s.id " +
                "WHERE r.nombre = 'CONTADOR' AND s.clave LIKE 'audatex%'");
        while(rs.next()) {
            System.out.println(rs.getString("rol") + " - " + rs.getString("submodulo") + " - " + rs.getBoolean("can_view"));
        }
        conn.close();
    }
}
